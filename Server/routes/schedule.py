from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from extensions import db
from models import Match, Team, Court, Category, Tournament
from datetime import datetime, timedelta, time as dtime
import math

schedule_blueprint = Blueprint('schedule', __name__, url_prefix='/api/schedule')

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _parse_hhmm(s: str, date: datetime) -> datetime:
    """Return a datetime on the same calendar day as `date` with time HH:MM."""
    h, m = map(int, s.split(':'))
    return date.replace(hour=h, minute=m, second=0, microsecond=0)


def resolve_slot(
    t: datetime,
    daily_start: str,
    daily_end: str,
    break_start: str | None,
    break_end:   str | None,
) -> datetime:
    """
    Given a candidate slot time `t`, return the earliest legal slot considering:
      1. Before daily_start — advance to daily_start on the same day
      2. Break window  — if t falls inside [break_start, break_end), advance to break_end
      3. Day boundary  — if t is past daily_end, roll over to next day at daily_start
    """
    for _ in range(10):
        end_dt   = _parse_hhmm(daily_end,   t)
        start_dt = _parse_hhmm(daily_start, t)

        # Too early — push to daily start
        if t < start_dt:
            t = start_dt
            continue

        if t >= end_dt:
            t = start_dt + timedelta(days=1)
            continue

        if break_start and break_end:
            bs = _parse_hhmm(break_start, t)
            be = _parse_hhmm(break_end,   t)
            if bs <= t < be:
                t = be
                continue

        break
    return t


# ──────────────────────────────────────────────────────────────────────────────
# Fairness helpers  (Equations 4-7 from specification)
# ──────────────────────────────────────────────────────────────────────────────

def calc_delta_r(team_a_id, team_b_id, team_last_finish: dict) -> timedelta:
    """ΔR = |T_finish_prev(B) − T_finish_prev(A)|   (Eq. 4)"""
    return abs(team_last_finish[team_a_id] - team_last_finish[team_b_id])


def calc_fatigue(team_id: int, t_current: datetime,
                 match_history: dict, window: timedelta) -> timedelta:
    """F_p(t) = Σ D_{p,i} for all i ∈ W(t)          (Eq. 5)"""
    window_start = t_current - window
    total = timedelta(0)
    for finish_time, duration in match_history.get(team_id, []):
        if finish_time >= window_start:
            total += duration
    return total


def calc_delta_f(team_a_id, team_b_id, t_current, match_history, window) -> timedelta:
    """ΔF = |F_A(t) − F_B(t)|                        (Eq. 6)"""
    fa = calc_fatigue(team_a_id, t_current, match_history, window)
    fb = calc_fatigue(team_b_id, t_current, match_history, window)
    return abs(fa - fb)


def is_fair(delta_r, delta_f, theta_r, theta_f) -> bool:
    """ΔR ≤ θ_R  AND  ΔF ≤ θ_F                       (Eq. 7)"""
    return delta_r <= theta_r and delta_f <= theta_f


# ──────────────────────────────────────────────────────────────────────────────
# Group assignment
# ──────────────────────────────────────────────────────────────────────────────

def assign_groups(teams, target_size=4):
    """
    Divide *teams* into groups as evenly as possible, targeting *target_size*.

    Examples:
      10 → 3 groups: 4+3+3
       8 → 2 groups: 4+4
       5 → 2 groups: 3+2
       9 → 3 groups: 3+3+3
      12 → 3 groups: 4+4+4
       7 → 2 groups: 4+3

    Returns dict  {'A': [Team, …], 'B': [Team, …], …}
    """
    n = len(teams)
    if n < 4:
        raise ValueError(f"Need at least 4 players to form groups. Got {n}.")

    num_groups = max(1, math.ceil(n / target_size))

    # Distribute as evenly as possible
    base_size = n // num_groups
    extra     = n % num_groups          # first 'extra' groups get +1 member

    groups = {}
    idx = 0
    for g in range(num_groups):
        code = chr(ord('A') + g)        # 'A', 'B', 'C', …
        size = base_size + (1 if g < extra else 0)
        groups[code] = teams[idx : idx + size]
        idx += size

    return groups


# ──────────────────────────────────────────────────────────────────────────────
# Round-robin match generation
# ──────────────────────────────────────────────────────────────────────────────

def generate_round_robin_matches(tournament_id, category_id=None):
    """
    Generate grouped round-robin matches for tournament_id, then immediately
    pre-generate all knockout bracket placeholder matches so the full schedule
    (GROUP + KNOCKOUT) is known from day one.

    1. Assign teams to groups of ~4
    2. Generate cross-group round-robin with fairness scheduling (GROUP matches)
    3. Pre-generate KNOCKOUT placeholder matches scheduled the next day after group stage
    4. All GROUP matches get stage='GROUP'; KNOCKOUT placeholders get home/away_team_id=None
       with home_placeholder/away_placeholder labels like "Winner Grp A".
    """
    tournament = Tournament.query.get(tournament_id)
    if not tournament:
        raise ValueError("Tournament not found.")

    MATCH_DURATION = timedelta(minutes=int(tournament.match_duration_minutes or 40))
    MIN_REST       = MATCH_DURATION * 0.5
    THETA_R        = MATCH_DURATION * 0.75
    THETA_F        = MATCH_DURATION * 1.0
    FATIGUE_WINDOW = timedelta(hours=4)

    DAILY_START = tournament.daily_start_time or '09:00'
    DAILY_END   = tournament.daily_end_time   or '18:00'
    BREAK_START = tournament.break_start_time or None
    BREAK_END   = tournament.break_end_time   or None

    # ── Teams ──
    query = Team.query.filter_by(tournament_id=tournament_id)
    if category_id:
        query = query.filter_by(category_id=category_id)
    teams = query.all()

    teams_by_cat = {}
    for t in teams:
        teams_by_cat.setdefault(t.category_id, []).append(t)

    courts = Court.query.filter_by(tournament_id=tournament_id).order_by(Court.id).all()
    if not courts:
        raise ValueError("No courts available. Please add courts before starting.")

    base_date = (tournament.start_date or datetime.now()).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    base_start = _parse_hhmm(DAILY_START, base_date)

    all_matches = []
    groups_by_cat = {}  # resolved_cat_id -> groups dict {'A': [teams], …}

    # Shared scheduling state across all categories and groups
    court_available = {c.id: base_start for c in courts}
    team_last_finish = {t.id: base_start - MIN_REST for t in teams}
    match_history = {}

    for cat_id, cat_teams in teams_by_cat.items():
        if len(cat_teams) < 4:
            raise ValueError(
                f"Need at least 4 players (got {len(cat_teams)}). "
                "Cannot form groups for round-robin."
            )

        resolved_cat_id = cat_id
        if resolved_cat_id is None:
            first_cat = Category.query.filter_by(tournament_id=tournament_id).first()
            resolved_cat_id = first_cat.id if first_cat else None
            if resolved_cat_id is None:
                continue

        # Assign groups & persist group_code on Team rows
        groups = assign_groups(cat_teams, target_size=4)
        groups_by_cat[resolved_cat_id] = groups  # save for knockout pre-generation
        for code, grp_teams in groups.items():
            for team in grp_teams:
                team.group_code = code
        db.session.flush()

        # 1. Generate all pairings per group, separated by logical 'round'.
        group_rounds = {}
        for code, grp_teams in groups.items():
            team_list = list(grp_teams)
            if len(team_list) % 2 == 1:
                team_list.append(None)  # BYE

            num_rounds = len(team_list) - 1
            half = len(team_list) // 2

            rounds_for_group = []
            for _ in range(num_rounds):
                pairs = []
                for i in range(half):
                    t1 = team_list[i]
                    t2 = team_list[len(team_list) - 1 - i]
                    if t1 is not None and t2 is not None:
                        pairs.append((t1, t2))
                rounds_for_group.append(pairs)
                # Rotate
                team_list = [team_list[0]] + [team_list[-1]] + team_list[1:-1]

            group_rounds[code] = rounds_for_group

        # 2. Collect all rounds globally and schedule
        max_r = max((len(r) for r in group_rounds.values()), default=0)

        for round_idx in range(max_r):
            # Gather all pairs across all groups for this round
            remaining = []
            for code, rounds_for_group in group_rounds.items():
                if round_idx < len(rounds_for_group):
                    for a, b in rounds_for_group[round_idx]:
                        remaining.append((code, a, b))

            # Schedule these pairs
            while remaining:
                best_court_id = min(court_available, key=court_available.get)
                t_raw = court_available[best_court_id]
                t_current = resolve_slot(t_raw, DAILY_START, DAILY_END, BREAK_START, BREAK_END)
                court_available[best_court_id] = t_current

                # Rested check
                rested = []
                for code, a, b in remaining:
                    rest_a = t_current - team_last_finish.get(a.id, base_start)
                    rest_b = t_current - team_last_finish.get(b.id, base_start)
                    if rest_a >= MIN_REST and rest_b >= MIN_REST:
                        rested.append((code, a, b))

                if not rested:
                    # Advance time to the next ready time of ANY team
                    next_ready = min(
                        (tf + MIN_REST for tf in team_last_finish.values() if tf + MIN_REST > t_current),
                        default=t_current + timedelta(minutes=5)
                    )
                    court_available[best_court_id] = next_ready
                    continue

                # Fairness selection among 'rested'
                candidates = []
                for code, a, b in rested:
                    dr = calc_delta_r(a.id, b.id, team_last_finish)
                    df = calc_delta_f(a.id, b.id, t_current, match_history, FATIGUE_WINDOW)
                    fair = is_fair(dr, df, THETA_R, THETA_F)
                    score = dr.total_seconds() + df.total_seconds()
                    candidates.append((code, a, b, dr, df, fair, score))

                fair_cands = [c for c in candidates if c[5]]  # fair is index 5
                chosen = min(fair_cands if fair_cands else candidates, key=lambda c: c[6])  # score is index 6

                ch_code, team_a, team_b = chosen[0], chosen[1], chosen[2]

                # Update remaining
                remaining = [item for item in remaining
                             if not (item[0] == ch_code and item[1].id == team_a.id and item[2].id == team_b.id)]

                # Build Match
                match = Match(
                    round=round_idx + 1,
                    group_code=ch_code,
                    stage='GROUP',
                    scheduled_at=t_current,
                    status="SCHEDULED",
                    tournament_id=tournament_id,
                    category_id=resolved_cat_id,
                    home_team_id=team_a.id,
                    away_team_id=team_b.id,
                    court_id=best_court_id,
                )
                all_matches.append(match)

                finish_time = t_current + MATCH_DURATION
                for tid in (team_a.id, team_b.id):
                    team_last_finish[tid] = finish_time
                    match_history.setdefault(tid, []).append((finish_time, MATCH_DURATION))
                court_available[best_court_id] = finish_time

    # ── Pre-generate knockout placeholder matches ─────────────────────────────
    if all_matches and groups_by_cat:
        ko_matches = pre_generate_knockout_matches(
            tournament_id, court_available, groups_by_cat
        )
        all_matches.extend(ko_matches)

    if all_matches:
        db.session.add_all(all_matches)
        db.session.commit()

    return all_matches


# ──────────────────────────────────────────────────────────────────────────────
# Knockout placeholder pre-generation
# ──────────────────────────────────────────────────────────────────────────────

def pre_generate_knockout_matches(tournament_id, court_available_after_group, groups_by_cat):
    """
    Create placeholder KNOCKOUT Match rows for the full bracket tree, scheduled
    the day after the last group-stage match.

    - home_team_id / away_team_id are NULL (unknown until group stage finishes)
    - home_placeholder / away_placeholder hold labels like "Winner Grp A"
    - Subsequent rounds get "TBD" labels until advance_knockout() fills them in
    """
    tournament = Tournament.query.get(tournament_id)
    if not tournament or not court_available_after_group:
        return []

    MATCH_DURATION = timedelta(minutes=int(tournament.match_duration_minutes or 40))
    DAILY_START = tournament.daily_start_time or '09:00'
    DAILY_END   = tournament.daily_end_time   or '18:00'
    BREAK_START = tournament.break_start_time or None
    BREAK_END   = tournament.break_end_time   or None

    # Knockout starts the day after the last scheduled group match
    last_group_time = max(court_available_after_group.values())
    ko_start_date = (last_group_time + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    base_ko_start = _parse_hhmm(DAILY_START, ko_start_date)

    # Fresh court availability for knockout
    court_available = {cid: base_ko_start for cid in court_available_after_group}

    round_labels = {2: 'F', 4: 'SF', 8: 'QF', 16: 'R16', 32: 'R32'}
    all_ko_matches = []

    for cat_id, groups in groups_by_cat.items():
        group_codes = sorted(groups.keys())
        n_qualifiers = len(group_codes) * 2
        if n_qualifiers < 2:
            continue

        bracket_size = _next_power_of_2(n_qualifiers)

        # Seeding order — same logic as generate_knockout_bracket
        seeds_top = [{'group': g, 'rank': 1} for g in group_codes]
        seeds_bot = [{'group': g, 'rank': 2} for g in reversed(group_codes)]
        seeded = []
        for i in range(max(len(seeds_top), len(seeds_bot))):
            if i < len(seeds_top):
                seeded.append(seeds_top[i])
            if i < len(seeds_bot):
                seeded.append(seeds_bot[i])
        while len(seeded) < bracket_size:
            seeded.append(None)  # BYE padding

        ko_round = 1
        current_size = bracket_size // 2  # matches in this round
        # Each round must start no earlier than the previous round fully ends.
        # This prevents SF/Final being assigned to idle courts at earlier times.
        round_earliest_start = base_ko_start

        while current_size >= 1:
            label = round_labels.get(current_size * 2, f'R{current_size * 2}')
            if current_size == 1:
                label = 'F'

            round_end = round_earliest_start  # track latest finish time in this round

            for pos_idx in range(current_size):
                bracket_pos = pos_idx + 1

                best_court = min(court_available, key=court_available.get)
                # Enforce floor: this round cannot start before the previous round ended
                effective_time = max(court_available[best_court], round_earliest_start)
                t_slot = resolve_slot(
                    effective_time, DAILY_START, DAILY_END, BREAK_START, BREAK_END
                )

                if ko_round == 1:
                    h_info = seeded[pos_idx * 2] if pos_idx * 2 < len(seeded) else None
                    a_info = seeded[pos_idx * 2 + 1] if pos_idx * 2 + 1 < len(seeded) else None
                    h_label = f"Winner Grp {h_info['group']}" if h_info else 'BYE'
                    a_label = f"Runner Up Grp {a_info['group']}" if a_info else 'BYE'
                else:
                    h_label = 'TBD'
                    a_label = 'TBD'

                m = Match(
                    round=ko_round,
                    group_code=label,
                    stage='KNOCKOUT',
                    bracket_position=bracket_pos,
                    scheduled_at=t_slot,
                    status='SCHEDULED',
                    tournament_id=tournament_id,
                    category_id=cat_id,
                    home_team_id=None,
                    away_team_id=None,
                    court_id=best_court,
                    home_placeholder=h_label,
                    away_placeholder=a_label,
                )
                all_ko_matches.append(m)
                court_available[best_court] = t_slot + MATCH_DURATION
                round_end = max(round_end, t_slot + MATCH_DURATION)

            # Advance the floor: next round starts no earlier than this round ends
            round_earliest_start = round_end

            current_size //= 2
            ko_round += 1

    return all_ko_matches


# ──────────────────────────────────────────────────────────────────────────────
# Court availability helper — queries DB for real court availability
# ──────────────────────────────────────────────────────────────────────────────

def _get_court_availability(tournament_id, courts, match_duration, base_fallback):
    """
    Query the DB to find when each court is next available, based on
    the latest scheduled/ongoing match on that court.
    Returns dict { court_id: earliest_available_datetime }.
    """
    availability = {}
    for court in courts:
        latest_match = (
            Match.query
            .filter_by(tournament_id=tournament_id, court_id=court.id)
            .filter(Match.status.in_(['SCHEDULED', 'IN_PROGRESS', 'FINISHED']))
            .order_by(Match.scheduled_at.desc())
            .first()
        )
        if latest_match and latest_match.scheduled_at:
            availability[court.id] = latest_match.scheduled_at + match_duration
        else:
            availability[court.id] = base_fallback
    return availability


# ──────────────────────────────────────────────────────────────────────────────
# Knockout bracket generation
# ──────────────────────────────────────────────────────────────────────────────

def _next_power_of_2(n):
    """Smallest power-of-2 >= n."""
    p = 1
    while p < n:
        p *= 2
    return p


def generate_knockout_bracket(tournament_id):
    """
    Populate the pre-generated knockout bracket placeholders with actual team IDs.

    After all GROUP matches finish, this function computes standings and updates
    the placeholder Round-1 KNOCKOUT matches with real home_team_id / away_team_id.
    BYEs are auto-advanced.

    Falls back to creating new Match rows if no pre-generated placeholders exist
    (backward compatibility with tournaments started before this feature).
    """
    tournament = Tournament.query.get(tournament_id)
    if not tournament:
        raise ValueError("Tournament not found.")

    # Ensure all GROUP matches are finished
    unfinished = Match.query.filter_by(
        tournament_id=tournament_id, stage='GROUP'
    ).filter(Match.status != 'FINISHED').count()

    if unfinished > 0:
        raise ValueError(
            f"{unfinished} group-stage match(es) still unfinished. "
            "Complete all group matches before generating the bracket."
        )

    from routes.tournament import compute_group_standings
    teams = Team.query.filter_by(tournament_id=tournament_id).all()

    cat_teams = {}
    for t in teams:
        cat_id = t.category_id or 1
        cat_teams.setdefault(cat_id, []).append(t)

    # Detect whether pre-generated placeholders exist
    has_placeholders = Match.query.filter_by(
        tournament_id=tournament_id,
        stage='KNOCKOUT',
        round=1,
    ).filter(Match.home_team_id == None).count() > 0  # noqa: E711

    if has_placeholders:
        return _fill_knockout_placeholders(tournament_id, tournament, cat_teams, compute_group_standings)
    else:
        return _create_knockout_bracket_legacy(tournament_id, tournament, cat_teams, compute_group_standings)


def _fill_knockout_placeholders(tournament_id, tournament, cat_teams, compute_group_standings):
    """Update pre-generated R1 knockout placeholders with actual team IDs."""
    matches_updated = []

    for cat_id, t_list in cat_teams.items():
        group_codes = sorted(set(t.group_code for t in t_list if t.group_code))

        qualifiers = []
        for code in group_codes:
            standings = compute_group_standings(tournament_id, code, cat_id)
            for row in standings[:2]:
                qualifiers.append({'team_id': row['teamId'], 'group': code, 'rank': row['rank']})

        if len(qualifiers) < 2:
            continue

        seeds_top = [q for q in qualifiers if q['rank'] == 1]
        seeds_bot = [q for q in qualifiers if q['rank'] == 2]
        seeds_bot.reverse()

        seeded = []
        for i in range(max(len(seeds_top), len(seeds_bot))):
            if i < len(seeds_top):
                seeded.append(seeds_top[i])
            if i < len(seeds_bot):
                seeded.append(seeds_bot[i])

        bracket_size = _next_power_of_2(len(seeded))
        while len(seeded) < bracket_size:
            seeded.append(None)

        num_first_round = bracket_size // 2

        for i in range(num_first_round):
            home_info = seeded[i * 2]
            away_info = seeded[i * 2 + 1]
            home_id = home_info['team_id'] if home_info else None
            away_id = away_info['team_id'] if away_info else None

            placeholder = Match.query.filter_by(
                tournament_id=tournament_id,
                category_id=cat_id,
                stage='KNOCKOUT',
                round=1,
                bracket_position=i + 1,
            ).first()

            if placeholder is None:
                continue

            if home_id and not away_id:
                placeholder.home_team_id = home_id
                placeholder.away_team_id = home_id
                placeholder.winner_team_id = home_id
                placeholder.status = 'FINISHED'
                placeholder.home_placeholder = None
                placeholder.away_placeholder = None
            elif not home_id and away_id:
                placeholder.home_team_id = away_id
                placeholder.away_team_id = away_id
                placeholder.winner_team_id = away_id
                placeholder.status = 'FINISHED'
                placeholder.home_placeholder = None
                placeholder.away_placeholder = None
            elif not home_id and not away_id:
                continue
            else:
                placeholder.home_team_id = home_id
                placeholder.away_team_id = away_id
                placeholder.home_placeholder = None
                placeholder.away_placeholder = None

            matches_updated.append(placeholder)

    if not matches_updated:
        raise ValueError(
            "No qualifying teams found to populate the bracket. "
            "Ensure group stage matches are complete and standings are valid."
        )

    tournament.current_stage = 'KNOCKOUT'
    db.session.commit()
    return matches_updated


def _create_knockout_bracket_legacy(tournament_id, tournament, cat_teams, compute_group_standings):
    """Legacy path: create new knockout Match rows (for old tournaments without pre-generated placeholders)."""
    MATCH_DURATION = timedelta(minutes=int(tournament.match_duration_minutes or 40))
    DAILY_START = tournament.daily_start_time or '09:00'
    DAILY_END   = tournament.daily_end_time   or '18:00'
    BREAK_START = tournament.break_start_time or None
    BREAK_END   = tournament.break_end_time   or None

    courts = Court.query.filter_by(tournament_id=tournament_id).order_by(Court.id).all()

    last_group = (
        Match.query.filter_by(tournament_id=tournament_id, stage='GROUP')
        .order_by(Match.scheduled_at.desc()).first()
    )
    if last_group and last_group.scheduled_at:
        ko_start_date = (last_group.scheduled_at + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
    else:
        ko_start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    base_start = _parse_hhmm(DAILY_START, ko_start_date)
    if not courts:
        court_available = {1: base_start}
    else:
        court_available = _get_court_availability(tournament_id, courts, MATCH_DURATION, base_start)

    round_labels = {2: 'F', 4: 'SF', 8: 'QF', 16: 'R16', 32: 'R32'}
    matches_created = []

    for cat_id, t_list in cat_teams.items():
        group_codes = sorted(set(t.group_code for t in t_list if t.group_code))

        qualifiers = []
        for code in group_codes:
            standings = compute_group_standings(tournament_id, code, cat_id)
            for row in standings[:2]:
                qualifiers.append({'team_id': row['teamId'], 'group': code, 'rank': row['rank']})

        if len(qualifiers) < 2:
            continue

        seeds_top = [q for q in qualifiers if q['rank'] == 1]
        seeds_bot = [q for q in qualifiers if q['rank'] == 2]
        seeds_bot.reverse()

        seeded = []
        for i in range(max(len(seeds_top), len(seeds_bot))):
            if i < len(seeds_top):
                seeded.append(seeds_top[i])
            if i < len(seeds_bot):
                seeded.append(seeds_bot[i])

        bracket_size = _next_power_of_2(len(seeded))
        while len(seeded) < bracket_size:
            seeded.append(None)

        num_first_round = bracket_size // 2
        first_round_label = round_labels.get(bracket_size, f'R{bracket_size}')

        for i in range(num_first_round):
            home_id = seeded[i * 2]['team_id'] if seeded[i * 2] else None
            away_id = seeded[i * 2 + 1]['team_id'] if seeded[i * 2 + 1] else None

            best_court = min(court_available, key=court_available.get)
            t_slot = resolve_slot(court_available[best_court], DAILY_START, DAILY_END, BREAK_START, BREAK_END)

            if home_id and not away_id:
                m = Match(round=1, group_code=first_round_label, stage='KNOCKOUT', bracket_position=i + 1,
                          scheduled_at=t_slot, status='FINISHED', tournament_id=tournament_id, category_id=cat_id,
                          home_team_id=home_id, away_team_id=home_id, winner_team_id=home_id,
                          court_id=best_court if courts else None)
            elif not home_id and away_id:
                m = Match(round=1, group_code=first_round_label, stage='KNOCKOUT', bracket_position=i + 1,
                          scheduled_at=t_slot, status='FINISHED', tournament_id=tournament_id, category_id=cat_id,
                          home_team_id=away_id, away_team_id=away_id, winner_team_id=away_id,
                          court_id=best_court if courts else None)
            elif not home_id and not away_id:
                continue
            else:
                m = Match(round=1, group_code=first_round_label, stage='KNOCKOUT', bracket_position=i + 1,
                          scheduled_at=t_slot, status='SCHEDULED', tournament_id=tournament_id, category_id=cat_id,
                          home_team_id=home_id, away_team_id=away_id,
                          court_id=best_court if courts else None)

            matches_created.append(m)
            court_available[best_court] = t_slot + MATCH_DURATION

    if not matches_created:
        raise ValueError("Not enough qualifiers across any category to form a bracket.")

    db.session.add_all(matches_created)
    tournament.current_stage = 'KNOCKOUT'
    db.session.commit()
    return matches_created


# ──────────────────────────────────────────────────────────────────────────────
# Knockout advancement — called when a knockout match finishes
# ──────────────────────────────────────────────────────────────────────────────

def advance_knockout(tournament_id, finished_match):
    """
    After a KNOCKOUT match finishes, fill the winner into the next-round slot
    immediately — no need to wait for the sibling match to also finish.

    Bracket positions are paired: (1,2) → next pos 1, (3,4) → next pos 2, etc.
    Odd positions fill the home slot; even positions fill the away slot.

    If pre-generated placeholder matches exist (new behavior), they are updated
    in-place immediately when one side finishes. The legacy fallback (create new
    Match row) still requires both teams to be known.
    """
    if finished_match.stage != 'KNOCKOUT' or not finished_match.winner_team_id:
        return None

    pos = finished_match.bracket_position
    if not pos:
        return None

    sibling_pos = pos + 1 if pos % 2 == 1 else pos - 1
    next_round = finished_match.round + 1
    next_pos = (min(pos, sibling_pos) + 1) // 2  # 1&2→1, 3&4→2

    sibling = Match.query.filter_by(
        tournament_id=tournament_id,
        category_id=finished_match.category_id,
        stage='KNOCKOUT',
        round=finished_match.round,
        bracket_position=sibling_pos,
    ).first()

    # Try to find a pre-generated placeholder for next round
    next_match = Match.query.filter_by(
        tournament_id=tournament_id,
        category_id=finished_match.category_id,
        stage='KNOCKOUT',
        round=next_round,
        bracket_position=next_pos,
    ).first()

    if next_match:
        # Immediately fill this match's slot — no need to wait for sibling
        if pos % 2 == 1:
            next_match.home_team_id = finished_match.winner_team_id
            next_match.home_placeholder = None
        else:
            next_match.away_team_id = finished_match.winner_team_id
            next_match.away_placeholder = None

        # If sibling also finished, fill the other slot too
        if sibling and sibling.status == 'FINISHED' and sibling.winner_team_id:
            if sibling_pos % 2 == 1:
                next_match.home_team_id = sibling.winner_team_id
                next_match.home_placeholder = None
            else:
                next_match.away_team_id = sibling.winner_team_id
                next_match.away_placeholder = None

        db.session.commit()
        return next_match

    # ── Legacy fallback: create a new Match row — needs both teams known ─────
    if not sibling or sibling.status != 'FINISHED' or not sibling.winner_team_id:
        return None  # can't create a new match row with only one team

    if pos % 2 == 1:
        home_id = finished_match.winner_team_id
        away_id = sibling.winner_team_id
    else:
        home_id = sibling.winner_team_id
        away_id = finished_match.winner_team_id

    # ── Legacy fallback: create a new Match row ───────────────────────────────
    tournament = Tournament.query.get(tournament_id)
    MATCH_DURATION = timedelta(minutes=int(tournament.match_duration_minutes or 40))
    DAILY_START = tournament.daily_start_time or '09:00'
    DAILY_END   = tournament.daily_end_time   or '18:00'
    BREAK_START = tournament.break_start_time or None
    BREAK_END   = tournament.break_end_time   or None

    round_labels = {2: 'F', 4: 'SF', 8: 'QF', 16: 'R16', 32: 'R32'}
    current_round_count = Match.query.filter_by(
        tournament_id=tournament_id, stage='KNOCKOUT', round=finished_match.round
    ).count()
    next_round_size = current_round_count // 2
    label = 'F' if next_round_size == 1 else round_labels.get(next_round_size * 2, f'R{next_round_size * 2}')

    courts = Court.query.filter_by(tournament_id=tournament_id).order_by(Court.id).all()
    latest_finish = max(
        finished_match.finished_at or datetime.now(),
        sibling.finished_at or datetime.now()
    )
    earliest_wanted = latest_finish + timedelta(minutes=30)

    if courts:
        court_available = _get_court_availability(tournament_id, courts, MATCH_DURATION, earliest_wanted)
        best_court, best_time = None, None
        for court_id, avail_time in court_available.items():
            candidate = resolve_slot(max(avail_time, earliest_wanted), DAILY_START, DAILY_END, BREAK_START, BREAK_END)
            if best_time is None or candidate < best_time:
                best_time, best_court = candidate, court_id
        t_slot = best_time
    else:
        best_court = None
        t_slot = resolve_slot(earliest_wanted, DAILY_START, DAILY_END, BREAK_START, BREAK_END)

    new_match = Match(
        round=next_round, group_code=label, stage='KNOCKOUT', bracket_position=next_pos,
        scheduled_at=t_slot, status='SCHEDULED', tournament_id=tournament_id,
        category_id=finished_match.category_id, home_team_id=home_id, away_team_id=away_id,
        court_id=best_court,
    )
    db.session.add(new_match)
    db.session.commit()
    return new_match


# ──────────────────────────────────────────────────────────────────────────────
# REST endpoint
# ──────────────────────────────────────────────────────────────────────────────

@schedule_blueprint.route('/generate', methods=['POST'])
@jwt_required()
def generate_schedule():
    from routes.utils import check_tournament_owner
    data = request.get_json()
    tournament_id = data.get('tournamentId')
    category_id   = data.get('categoryId')

    if not tournament_id:
        return jsonify({"error": "tournamentId required"}), 400

    try:
        tournament = Tournament.query.get(tournament_id)
        if not tournament:
            return jsonify({"error": "Tournament not found"}), 404
        allowed, err = check_tournament_owner(tournament)
        if not allowed:
            return err

        if tournament.status != 'DRAFT':
            return jsonify({
                "error": f"Cannot generate schedule for a tournament with status '{tournament.status}'. Schedule generation is only allowed when the tournament is in DRAFT status."
            }), 400

        matches = generate_round_robin_matches(tournament_id, category_id)
        t = tournament
        return jsonify({
            "message": f"Generated {len(matches)} matches.",
            "matchCount": len(matches),
            "scheduleConfig": {
                "dailyStartTime": t.daily_start_time,
                "dailyEndTime": t.daily_end_time,
                "matchDurationMinutes": t.match_duration_minutes,
                "breakStartTime": t.break_start_time,
                "breakEndTime": t.break_end_time,
            }
        }), 201

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
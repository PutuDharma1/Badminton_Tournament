from flask import Blueprint, jsonify, request
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
      1. Break window  — if t falls inside [break_start, break_end), advance to break_end
      2. Day boundary  — if t is past daily_end, roll over to next day at daily_start
    """
    for _ in range(10):
        end_dt   = _parse_hhmm(daily_end,   t)
        start_dt = _parse_hhmm(daily_start, t)

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
# Per-group round-robin match generation
# ──────────────────────────────────────────────────────────────────────────────

def _generate_rr_for_group(
    group_code, group_teams, resolved_cat_id, tournament_id,
    courts, base_start,
    court_available, team_last_finish, match_history,
    match_duration, min_rest, theta_r, theta_f, fatigue_window,
    daily_start, daily_end, break_start, break_end,
):
    """Generate circle-rotation round-robin matches for one group."""
    team_list = list(group_teams)
    if len(team_list) % 2 == 1:
        team_list.append(None)  # BYE
    num_rounds = len(team_list) - 1
    half = len(team_list) // 2

    matches_created = []

    for round_num in range(1, num_rounds + 1):
        round_pairings = [
            (team_list[i], team_list[len(team_list) - 1 - i])
            for i in range(half)
            if team_list[i] is not None and team_list[len(team_list) - 1 - i] is not None
        ]
        remaining = list(round_pairings)

        while remaining:
            best_court_id = min(court_available, key=court_available.get)
            t_raw = court_available[best_court_id]
            t_current = resolve_slot(t_raw, daily_start, daily_end, break_start, break_end)
            court_available[best_court_id] = t_current

            rested = [
                (a, b) for a, b in remaining
                if (t_current - team_last_finish.get(a.id, base_start)) >= min_rest
                and (t_current - team_last_finish.get(b.id, base_start)) >= min_rest
            ]

            if not rested:
                next_ready = min(
                    (tf + min_rest for tf in team_last_finish.values() if tf + min_rest > t_current),
                    default=t_current + timedelta(minutes=5)
                )
                court_available[best_court_id] = next_ready
                continue

            # Fairness selection
            candidates = []
            for a, b in rested:
                dr = calc_delta_r(a.id, b.id, team_last_finish)
                df = calc_delta_f(a.id, b.id, t_current, match_history, fatigue_window)
                fair = is_fair(dr, df, theta_r, theta_f)
                score = dr.total_seconds() + df.total_seconds()
                candidates.append((a, b, dr, df, fair, score))

            fair_cands = [c for c in candidates if c[4]]
            chosen = min(fair_cands if fair_cands else candidates, key=lambda c: c[5])
            team_a, team_b = chosen[0], chosen[1]

            remaining = [(a, b) for a, b in remaining
                         if not (a.id == team_a.id and b.id == team_b.id)]

            match = Match(
                round=round_num,
                group_code=group_code,
                stage='GROUP',
                scheduled_at=t_current,
                status="SCHEDULED",
                tournament_id=tournament_id,
                category_id=resolved_cat_id,
                home_team_id=team_a.id,
                away_team_id=team_b.id,
                court_id=best_court_id,
            )
            matches_created.append(match)

            finish_time = t_current + match_duration
            for tid in (team_a.id, team_b.id):
                team_last_finish[tid] = finish_time
                match_history.setdefault(tid, []).append((finish_time, match_duration))
            court_available[best_court_id] = finish_time

        # Circle rotation
        team_list = [team_list[0]] + [team_list[-1]] + team_list[1:-1]

    return matches_created


def generate_round_robin_matches(tournament_id, category_id=None):
    """
    Generate grouped round-robin matches for tournament_id.

    1. Assign teams to groups of ~4
    2. Generate round-robin per group with fairness scheduling
    3. All matches get stage='GROUP' and group_code='A'/'B'/'C'/…
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
        for code, grp_teams in groups.items():
            for team in grp_teams:
                team.group_code = code
        db.session.flush()

        # Shared scheduling state across groups (courts shared)
        court_available = {c.id: base_start for c in courts}
        team_last_finish = {t.id: base_start for t in cat_teams}
        match_history = {}

        for code, grp_teams in groups.items():
            matches = _generate_rr_for_group(
                group_code=code,
                group_teams=grp_teams,
                resolved_cat_id=resolved_cat_id,
                tournament_id=tournament_id,
                courts=courts,
                base_start=base_start,
                court_available=court_available,
                team_last_finish=team_last_finish,
                match_history=match_history,
                match_duration=MATCH_DURATION,
                min_rest=MIN_REST,
                theta_r=THETA_R,
                theta_f=THETA_F,
                fatigue_window=FATIGUE_WINDOW,
                daily_start=DAILY_START,
                daily_end=DAILY_END,
                break_start=BREAK_START,
                break_end=BREAK_END,
            )
            all_matches.extend(matches)

    if all_matches:
        db.session.add_all(all_matches)
        db.session.commit()

    return all_matches


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
    Generate single-elimination bracket from top-2 per group.

    Seeding: cross-group (A1 vs last-group's #2, etc.)
    BYEs auto-advance if bracket size > qualifier count.
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

    # Get group standings — top 2 per group
    from routes.tournament import compute_group_standings
    teams = Team.query.filter_by(tournament_id=tournament_id).all()
    group_codes = sorted(set(t.group_code for t in teams if t.group_code))

    qualifiers = []  # list of (team_id, seed_label)  e.g. ('A', 1)
    for code in group_codes:
        standings = compute_group_standings(tournament_id, code)
        for row in standings[:2]:  # top 2
            qualifiers.append({
                'team_id': row['teamId'],
                'group': code,
                'rank': row['rank'],
            })

    if len(qualifiers) < 2:
        raise ValueError("Not enough qualifiers to form a bracket.")

    # Cross-group seeding: A1, B2, C1, D2, … vs reverse
    seeds_top = [q for q in qualifiers if q['rank'] == 1]
    seeds_bot = [q for q in qualifiers if q['rank'] == 2]
    seeds_bot.reverse()  # cross-seed

    seeded = []
    for i in range(max(len(seeds_top), len(seeds_bot))):
        if i < len(seeds_top):
            seeded.append(seeds_top[i])
        if i < len(seeds_bot):
            seeded.append(seeds_bot[i])

    n_qualifiers = len(seeded)
    bracket_size = _next_power_of_2(n_qualifiers)

    # Pad with BYEs (None)
    while len(seeded) < bracket_size:
        seeded.append(None)

    # Determine round labels
    round_labels = {
        2: 'F',
        4: 'SF',
        8: 'QF',
        16: 'R16',
        32: 'R32',
    }

    # Get scheduling info
    MATCH_DURATION = timedelta(minutes=int(tournament.match_duration_minutes or 40))
    DAILY_START = tournament.daily_start_time or '09:00'
    DAILY_END   = tournament.daily_end_time   or '18:00'
    BREAK_START = tournament.break_start_time or None
    BREAK_END   = tournament.break_end_time   or None

    courts = Court.query.filter_by(tournament_id=tournament_id).order_by(Court.id).all()
    cat = Category.query.filter_by(tournament_id=tournament_id).first()
    cat_id = cat.id if cat else 1

    # Find the day after last group match
    last_group = (
        Match.query
        .filter_by(tournament_id=tournament_id, stage='GROUP')
        .order_by(Match.scheduled_at.desc())
        .first()
    )
    if last_group and last_group.scheduled_at:
        ko_start_date = (last_group.scheduled_at + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
    else:
        ko_start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    base_start = _parse_hhmm(DAILY_START, ko_start_date)
    court_available = {c.id: base_start for c in courts}

    matches_created = []

    # === First round: create matches from seeded pairs ===
    num_first_round = bracket_size // 2
    first_round_label = round_labels.get(bracket_size, f'R{bracket_size}')
    ko_round = 1

    for i in range(num_first_round):
        team_a_info = seeded[i * 2]
        team_b_info = seeded[i * 2 + 1]

        home_id = team_a_info['team_id'] if team_a_info else None
        away_id = team_b_info['team_id'] if team_b_info else None

        # BYE handling: if one side is None, auto-advance
        if home_id and not away_id:
            # home auto-advances — create a placeholder match marked FINISHED
            best_court = min(court_available, key=court_available.get)
            t_slot = resolve_slot(court_available[best_court], DAILY_START, DAILY_END, BREAK_START, BREAK_END)
            m = Match(
                round=ko_round,
                group_code=first_round_label,
                stage='KNOCKOUT',
                bracket_position=i + 1,
                scheduled_at=t_slot,
                status='FINISHED',
                tournament_id=tournament_id,
                category_id=cat_id,
                home_team_id=home_id,
                away_team_id=home_id,  # self-match for BYE
                winner_team_id=home_id,
                court_id=best_court,
            )
            matches_created.append(m)
            court_available[best_court] = t_slot + MATCH_DURATION
            continue

        if not home_id and away_id:
            best_court = min(court_available, key=court_available.get)
            t_slot = resolve_slot(court_available[best_court], DAILY_START, DAILY_END, BREAK_START, BREAK_END)
            m = Match(
                round=ko_round,
                group_code=first_round_label,
                stage='KNOCKOUT',
                bracket_position=i + 1,
                scheduled_at=t_slot,
                status='FINISHED',
                tournament_id=tournament_id,
                category_id=cat_id,
                home_team_id=away_id,
                away_team_id=away_id,
                winner_team_id=away_id,
                court_id=best_court,
            )
            matches_created.append(m)
            court_available[best_court] = t_slot + MATCH_DURATION
            continue

        if not home_id and not away_id:
            continue  # both BYE, skip

        # Normal match
        best_court = min(court_available, key=court_available.get)
        t_slot = resolve_slot(court_available[best_court], DAILY_START, DAILY_END, BREAK_START, BREAK_END)
        m = Match(
            round=ko_round,
            group_code=first_round_label,
            stage='KNOCKOUT',
            bracket_position=i + 1,
            scheduled_at=t_slot,
            status='SCHEDULED',
            tournament_id=tournament_id,
            category_id=cat_id,
            home_team_id=home_id,
            away_team_id=away_id,
            court_id=best_court,
        )
        matches_created.append(m)
        court_available[best_court] = t_slot + MATCH_DURATION

    # === Subsequent rounds: create placeholder matches (teams TBD) ===
    current_count = num_first_round
    ko_round += 1
    while current_count > 1:
        next_count = current_count // 2
        label = round_labels.get(current_count, f'R{current_count}')
        for i in range(next_count):
            best_court = min(court_available, key=court_available.get)
            t_slot = resolve_slot(court_available[best_court], DAILY_START, DAILY_END, BREAK_START, BREAK_END)
            # Placeholder — home/away will be filled when previous round completes
            # For now, we need valid team IDs since columns are NOT NULL.
            # We'll use a sentinel approach: create the match only when winners are known.
            # Instead, store these as metadata and create later.
            pass
        current_count = next_count
        ko_round += 1

    # NOTE: Only first-round knockout matches are created eagerly.
    # Subsequent rounds are created dynamically via advance_knockout().

    if matches_created:
        db.session.add_all(matches_created)
        db.session.commit()

    return matches_created


# ──────────────────────────────────────────────────────────────────────────────
# Knockout advancement — called when a knockout match finishes
# ──────────────────────────────────────────────────────────────────────────────

def advance_knockout(tournament_id, finished_match):
    """
    After a KNOCKOUT match finishes, check if we can create / fill
    the next-round match.

    Bracket positions are paired: (1,2) → next pos 1, (3,4) → next pos 2, etc.
    """
    if finished_match.stage != 'KNOCKOUT' or not finished_match.winner_team_id:
        return None

    pos = finished_match.bracket_position
    if not pos:
        return None

    # Find sibling match (positions are paired: 1&2, 3&4, 5&6…)
    if pos % 2 == 1:
        sibling_pos = pos + 1
    else:
        sibling_pos = pos - 1

    sibling = Match.query.filter_by(
        tournament_id=tournament_id,
        stage='KNOCKOUT',
        round=finished_match.round,
        bracket_position=sibling_pos,
    ).first()

    if not sibling or sibling.status != 'FINISHED' or not sibling.winner_team_id:
        return None  # sibling hasn't finished yet

    # Both siblings finished — create next-round match
    next_round = finished_match.round + 1
    next_pos = (min(pos, sibling_pos) + 1) // 2  # 1&2→1, 3&4→2

    # Determine round label
    round_labels = {2: 'F', 4: 'SF', 8: 'QF', 16: 'R16', 32: 'R32'}
    # Count how many matches in next round should exist
    current_round_count = Match.query.filter_by(
        tournament_id=tournament_id, stage='KNOCKOUT', round=finished_match.round
    ).count()
    next_round_size = current_round_count // 2
    label = round_labels.get(next_round_size * 2, f'R{next_round_size * 2}')
    if next_round_size == 1:
        label = 'F'

    tournament = Tournament.query.get(tournament_id)
    MATCH_DURATION = timedelta(minutes=int(tournament.match_duration_minutes or 40))
    DAILY_START = tournament.daily_start_time or '09:00'
    DAILY_END   = tournament.daily_end_time   or '18:00'
    BREAK_START = tournament.break_start_time or None
    BREAK_END   = tournament.break_end_time   or None

    courts = Court.query.filter_by(tournament_id=tournament_id).order_by(Court.id).all()
    cat = Category.query.filter_by(tournament_id=tournament_id).first()

    # Schedule after both matches finished
    latest_finish = max(
        finished_match.finished_at or datetime.now(),
        sibling.finished_at or datetime.now()
    )
    t_slot = latest_finish + timedelta(minutes=30)

    best_court = courts[0].id if courts else None
    t_slot = resolve_slot(t_slot, DAILY_START, DAILY_END, BREAK_START, BREAK_END)

    # Assign correct home/away based on bracket position
    if pos % 2 == 1:
        home_id = finished_match.winner_team_id
        away_id = sibling.winner_team_id
    else:
        home_id = sibling.winner_team_id
        away_id = finished_match.winner_team_id

    new_match = Match(
        round=next_round,
        group_code=label,
        stage='KNOCKOUT',
        bracket_position=next_pos,
        scheduled_at=t_slot,
        status='SCHEDULED',
        tournament_id=tournament_id,
        category_id=cat.id if cat else 1,
        home_team_id=home_id,
        away_team_id=away_id,
        court_id=best_court,
    )
    db.session.add(new_match)
    db.session.commit()

    return new_match


# ──────────────────────────────────────────────────────────────────────────────
# REST endpoint
# ──────────────────────────────────────────────────────────────────────────────

@schedule_blueprint.route('/generate', methods=['POST'])
def generate_schedule():
    data = request.get_json()
    tournament_id = data.get('tournamentId')
    category_id   = data.get('categoryId')

    if not tournament_id:
        return jsonify({"error": "tournamentId required"}), 400

    try:
        matches = generate_round_robin_matches(tournament_id, category_id)
        t = Tournament.query.get(tournament_id)
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
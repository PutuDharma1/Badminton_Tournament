"""
Seed script to create 2 dummy tournaments with age-based categories:
1. "Turnamen Merdeka Cup" — DRAFT, ready to start round-robin (8 players per category × all age groups)
2. "Turnamen Pahlawan Open" — ONGOING, round-robin FINISHED, ready to generate knockout bracket

Requires: seed.py to have been run first (creates COMMITTEE and REFEREE users).

Usage:
    python seed_two_tournaments.py
"""

from app import app
from extensions import db
from models import (
    Tournament, Category, User, Participant, Team, TeamParticipant,
    Match, MatchSet, Court
)
from services.age_rules import CATEGORY_RULES, AGE_GROUP_MAP
from routes.schedule import resolve_slot, pre_generate_knockout_matches
from datetime import datetime, timedelta
import random
import math

# ── Name pools ────────────────────────────────────────────────────────────────
FIRST_NAMES_M = [
    "Budi", "Andi", "Joko", "Ryu", "Ken", "Dhani", "Reza", "Taufik",
    "Kevin", "Marcus", "Jonatan", "Anthony", "Fajar", "Rian", "Shesar",
    "Leo", "Bagas", "Chico", "Ikhsan", "Dwi", "Wisnu", "Galih", "Arya",
    "Dimas", "Farhan", "Gilang", "Hendra", "Irfan", "Jaya", "Krisna",
]
FIRST_NAMES_F = [
    "Susi", "Sita", "Rina", "Ayu", "Dewi", "Putri", "Lili", "Greysia",
    "Apriyani", "Maria", "Fitriani", "Nita", "Dina", "Eka", "Feni",
    "Gita", "Hani", "Indah", "Jasmine", "Kartika", "Luna", "Mega",
    "Nadia", "Ocha", "Prisa", "Qori", "Ratna", "Sari", "Tina", "Umi",
]
LAST_NAMES = [
    "Santoso", "Wijaya", "Kusuma", "Hidayat", "Sukamuljo", "Gideon",
    "Christie", "Ginting", "Susanti", "Polii", "Rahayu", "Setiawan",
    "Prasetyo", "Cahyono", "Wibowo", "Saputra", "Nugroho", "Darmawan",
]

# Counter for unique names/emails
_counter = [9000]


def _next():
    _counter[0] += 1
    return _counter[0]


def birth_date_for_age(age):
    """Return a birth_date such that the person is `age` years old in 2026."""
    year = 2026 - age - 1  # so they turn `age` during the year
    month = random.randint(1, 6)  # born in first half so age is reached
    day = random.randint(1, 28)
    return datetime(year, month, day)


def make_player(gender, tournament_id, category_id, age_group_name):
    """Create a participant with an age appropriate for the given age group."""
    c = _next()
    fn = random.choice(FIRST_NAMES_M if gender == "MALE" else FIRST_NAMES_F)
    ln = random.choice(LAST_NAMES)
    name = f"{fn} {ln} {c}"

    min_age, max_age = AGE_GROUP_MAP[age_group_name]
    if age_group_name == "OPEN":
        age = random.randint(15, 35)
    else:
        age = random.randint(min_age, max_age - 1)

    p = Participant(
        full_name=name,
        birth_date=birth_date_for_age(age),
        gender=gender,
        email=f"seed{c}@dummy.com",
        phone=f"+628{random.randint(100000000, 999999999)}",
        tournament_id=tournament_id,
        category_id=category_id,
        is_active=True,
    )
    db.session.add(p)
    db.session.flush()
    return p


def make_single_team(gender, tournament, category, age_group_name):
    """Create a Team with 1 participant (singles)."""
    p = make_player(gender, tournament.id, category.id, age_group_name)
    team = Team(name=p.full_name, tournament_id=tournament.id, category_id=category.id)
    db.session.add(team)
    db.session.flush()
    db.session.add(TeamParticipant(team_id=team.id, participant_id=p.id))
    return team


def generate_rr_pairs(teams):
    """Generate round-robin pairings for a list of teams."""
    pairs = []
    tl = list(teams)
    if len(tl) % 2 == 1:
        tl.append(None)
    n = len(tl)
    for _ in range(n - 1):
        for i in range(n // 2):
            a, b = tl[i], tl[n - 1 - i]
            if a is not None and b is not None:
                pairs.append((a, b))
        tl = [tl[0]] + [tl[-1]] + tl[1:-1]
    return pairs


def assign_groups(teams, target_size=4):
    """Divide teams into groups of ~target_size."""
    n = len(teams)
    num_groups = max(1, math.ceil(n / target_size))
    base_size = n // num_groups
    extra = n % num_groups
    groups = {}
    idx = 0
    for g in range(num_groups):
        code = chr(ord('A') + g)
        size = base_size + (1 if g < extra else 0)
        groups[code] = teams[idx:idx + size]
        idx += size
    return groups


def random_set_score():
    """Generate a valid badminton set score (winner always first)."""
    loser = random.randint(5, 19)
    return 21, loser


# ── Age groups to use ────────────────────────────────────────────────────────
# We use: U13, U15, U17, U19, OPEN (skipping U11 for practicality)
AGE_GROUPS_TO_USE = ["U13", "U15", "U17", "U19", "OPEN"]

# Category templates: (format, gender)
CATEGORY_TEMPLATES = [
    ("SINGLE", "MALE"),
    ("SINGLE", "FEMALE"),
]


def run():
    with app.app_context():
        # --- Clean up old dummy data ---
        print("Cleaning up old dummy data...")
        MatchSet.query.delete()
        Match.query.delete()
        TeamParticipant.query.delete()
        Team.query.delete()
        Court.query.delete()
        Participant.query.delete()
        Category.query.delete()
        Tournament.query.delete()
        db.session.commit()
        print("Old data deleted!\n")

        admin = User.query.filter_by(role='COMMITTEE').first()
        if not admin:
            print("ERROR: No COMMITTEE user found. Run seed.py first.")
            return

        referee = User.query.filter_by(role='REFEREE').first()

        # ═══════════════════════════════════════════════════════════════
        # Tournament 1: DRAFT — Ready to START Round-Robin
        # ═══════════════════════════════════════════════════════════════
        print("=" * 70)
        print(" Creating Tournament 1: Siap di-Start Round-Robin")
        print("=" * 70)

        t1 = Tournament(
            name="Turnamen Merdeka Cup 2026",
            location="GOR Senayan, Jakarta",
            start_date=datetime(2026, 4, 1),
            end_date=datetime(2026, 4, 10),
            description="Tournament DRAFT — siap untuk klik Start Tournament dan generate round-robin.",
            status="DRAFT",
            current_stage=None,
            match_duration_minutes=40,
            daily_start_time="09:00",
            daily_end_time="18:00",
            break_start_time="12:00",
            break_end_time="13:00",
            created_by_id=admin.id,
        )
        db.session.add(t1)
        db.session.commit()

        # Courts
        for i in range(1, 5):
            db.session.add(Court(name=f"Court {i}", tournament_id=t1.id))
        db.session.commit()

        total_players_t1 = 0

        for age_group in AGE_GROUPS_TO_USE:
            for cat_type, gender in CATEGORY_TEMPLATES:
                min_age, max_age = AGE_GROUP_MAP[age_group]
                gender_label = {"MALE": "Men's", "FEMALE": "Women's", "MIXED": "Mixed"}[gender]
                type_label = "Singles" if cat_type == "SINGLE" else "Doubles"
                cat_name = f"{age_group} {gender_label} {type_label}"

                cat = Category(
                    name=cat_name,
                    gender=gender,
                    level="OPEN",
                    category_type=cat_type,
                    min_age=min_age,
                    max_age=max_age,
                    tournament_id=t1.id,
                )
                db.session.add(cat)
                db.session.commit()

                # 8 players per category
                for _ in range(8):
                    make_single_team(gender, t1, cat, age_group)
                total_players_t1 += 8

                print(f"  ✅ {cat_name}: 8 players")

        db.session.commit()
        print(f"\n  📊 Total: {total_players_t1} players across {len(AGE_GROUPS_TO_USE) * len(CATEGORY_TEMPLATES)} categories")
        print(f"  🏟️  Tournament ID: {t1.id} — Status: DRAFT — Ready to Start!\n")

        # ═══════════════════════════════════════════════════════════════
        # Tournament 2: ONGOING — Round-Robin FINISHED, ready for Knockout
        # ═══════════════════════════════════════════════════════════════
        print("=" * 70)
        print(" Creating Tournament 2: RR Selesai, Siap Generate Knockout")
        print("=" * 70)

        t2 = Tournament(
            name="Turnamen Pahlawan Open 2026",
            location="GOR Jatidiri, Semarang",
            start_date=datetime(2026, 3, 20),
            end_date=datetime(2026, 3, 30),
            description="Round-robin sudah selesai semua. Tinggal klik Generate Knockout Bracket.",
            status="ONGOING",
            current_stage="GROUP",
            match_duration_minutes=40,
            daily_start_time="09:00",
            daily_end_time="18:00",
            break_start_time="12:00",
            break_end_time="13:00",
            created_by_id=admin.id,
        )
        db.session.add(t2)
        db.session.commit()

        for i in range(1, 5):
            db.session.add(Court(name=f"Court {i}", tournament_id=t2.id))
        db.session.commit()
        courts2 = Court.query.filter_by(tournament_id=t2.id).order_by(Court.id).all()

        total_players_t2 = 0
        total_matches_t2 = 0

        # Track court availability for realistic scheduling
        MATCH_DURATION = timedelta(minutes=40)
        DAILY_START = "09:00"
        DAILY_END = "18:00"
        BREAK_START = "12:00"
        BREAK_END = "13:00"

        court_available = {c.id: datetime(2026, 3, 20, 9, 0) for c in courts2}
        groups_by_cat = {}

        for age_group in AGE_GROUPS_TO_USE:
            for cat_type, gender in CATEGORY_TEMPLATES:
                min_age, max_age = AGE_GROUP_MAP[age_group]
                gender_label = {"MALE": "Men's", "FEMALE": "Women's", "MIXED": "Mixed"}[gender]
                type_label = "Singles" if cat_type == "SINGLE" else "Doubles"
                cat_name = f"{age_group} {gender_label} {type_label}"

                cat = Category(
                    name=cat_name,
                    gender=gender,
                    level="OPEN",
                    category_type=cat_type,
                    min_age=min_age,
                    max_age=max_age,
                    tournament_id=t2.id,
                )
                db.session.add(cat)
                db.session.commit()

                # 8 teams → 2 groups of 4
                teams = []
                for _ in range(8):
                    teams.append(make_single_team(gender, t2, cat, age_group))
                db.session.commit()
                total_players_t2 += 8

                # Assign groups
                random.shuffle(teams)
                groups = assign_groups(teams, target_size=4)
                groups_by_cat[cat.id] = groups
                for code, grp_teams in groups.items():
                    for team in grp_teams:
                        team.group_code = code
                db.session.commit()

                # Generate and finish round-robin matches with realistic scheduling
                cat_matches = 0
                for group_code, grp_teams in groups.items():
                    pairs = generate_rr_pairs(grp_teams)

                    for pair_idx, (team_a, team_b) in enumerate(pairs):
                        round_num = (pair_idx // 2) + 1

                        # Find earliest available court
                        best_court_id = min(court_available, key=court_available.get)
                        raw_time = court_available[best_court_id]
                        scheduled = resolve_slot(raw_time, DAILY_START, DAILY_END, BREAK_START, BREAK_END)

                        court_obj = next(c for c in courts2 if c.id == best_court_id)
                        winner = random.choice([team_a, team_b])
                        match_len = timedelta(minutes=random.randint(25, 38))

                        m = Match(
                            round=round_num,
                            group_code=group_code,
                            stage='GROUP',
                            scheduled_at=scheduled,
                            started_at=scheduled,
                            finished_at=scheduled + match_len,
                            status='FINISHED',
                            tournament_id=t2.id,
                            category_id=cat.id,
                            home_team_id=team_a.id,
                            away_team_id=team_b.id,
                            winner_team_id=winner.id,
                            court_id=best_court_id,
                            referee_id=referee.id if referee else None,
                            home_score=2 if winner.id == team_a.id else 0,
                            away_score=2 if winner.id == team_b.id else 0,
                            finish_reason='NORMAL',
                        )
                        db.session.add(m)
                        db.session.flush()

                        # Update court availability
                        court_available[best_court_id] = scheduled + MATCH_DURATION

                        # Create 2 set scores
                        for set_num in range(1, 3):
                            w_score, l_score = random_set_score()
                            if winner.id == team_a.id:
                                h, a = w_score, l_score
                            else:
                                h, a = l_score, w_score
                            db.session.add(MatchSet(
                                match_id=m.id, set_number=set_num,
                                home_score=h, away_score=a,
                            ))

                        cat_matches += 1

                total_matches_t2 += cat_matches
                print(f"  ✅ {cat_name}: 8 players, {cat_matches} matches (all FINISHED)")

        db.session.commit()
        
        # Pre-generate knockout placeholder matches because T2 is 'ONGOING' and ready for knockout!
        ko_matches = pre_generate_knockout_matches(t2.id, court_available, groups_by_cat)
        if ko_matches:
            db.session.add_all(ko_matches)
            db.session.commit()
            print(f"  ✅ Pre-generated {len(ko_matches)} knockout placeholder matches!")

        print(f"\n  📊 Total: {total_players_t2} players, {total_matches_t2} matches")
        print(f"  🏟️  Tournament ID: {t2.id} — Status: ONGOING — Ready for Knockout!\n")

        # ── Summary ───────────────────────────────────────────────────────────
        print("=" * 70)
        print(" DONE! Summary:")
        print(f"   1. '{t1.name}' (ID: {t1.id})")
        print(f"      → Status: DRAFT, {total_players_t1} players")
        print(f"      → Klik 'Start Tournament' untuk mulai round-robin")
        print(f"   2. '{t2.name}' (ID: {t2.id})")
        print(f"      → Status: ONGOING, {total_players_t2} players, {total_matches_t2} matches")
        print(f"      → Klik 'Generate Knockout' untuk mulai babak eliminasi")
        print("=" * 70)


if __name__ == '__main__':
    run()

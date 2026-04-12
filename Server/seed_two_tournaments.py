"""
Seed script to create 2 dummy tournaments with age-based categories:
1. "Turnamen Merdeka Cup" — DRAFT, ready to start round-robin (8 players per category × all age groups)
2. "Turnamen Pahlawan Open" — ONGOING, round-robin FINISHED, ready to generate knockout bracket

Also seeds RefereeApplication records:
 - T1 (DRAFT): referees have PENDING applications awaiting committee review
 - T2 (ONGOING): mix of ACCEPTED, PENDING, and REJECTED applications

Requires: seed.py to have been run first (creates COMMITTEE user).

Usage:
    python seed_two_tournaments.py
"""

from app import app
from extensions import db, bcrypt
from models import (
    Tournament, Category, User, Participant, Team, TeamParticipant,
    Match, MatchSet, Court, RefereeApplication
)
from services.age_rules import CATEGORY_RULES, AGE_GROUP_MAP
from routes.schedule import resolve_slot, pre_generate_knockout_matches
from datetime import datetime, timedelta
import random
import math

# -- Name pools ----------------------------------------------------------------
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


def make_double_team(gender, tournament, category, age_group_name):
    """Create a Team with 2 participants (doubles)."""
    p1 = make_player(gender, tournament.id, category.id, age_group_name)
    p2 = make_player(gender, tournament.id, category.id, age_group_name)
    first1 = p1.full_name.split()[0]
    first2 = p2.full_name.split()[0]
    team = Team(name=f"{first1}/{first2}", tournament_id=tournament.id, category_id=category.id)
    db.session.add(team)
    db.session.flush()
    db.session.add(TeamParticipant(team_id=team.id, participant_id=p1.id))
    db.session.add(TeamParticipant(team_id=team.id, participant_id=p2.id))
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


# -- Age groups to use --------------------------------------------------------
# We use: U13, U15, U17, U19, OPEN (skipping U11 for practicality)
AGE_GROUPS_TO_USE = ["U13", "U15", "U17", "U19", "OPEN"]

# Category templates: (format, gender)
CATEGORY_TEMPLATES = [
    ("SINGLE", "MALE"),
    ("SINGLE", "FEMALE"),
]


# -- Referee profiles ---------------------------------------------------------
REFEREE_PROFILES = [
    {"name": "Ahmad Fauzi",    "email": "referee1@dummy.com", "gender": "MALE",   "birth_year": 1985},
    {"name": "Budi Hartono",   "email": "referee2@dummy.com", "gender": "MALE",   "birth_year": 1990},
    {"name": "Citra Dewi",     "email": "referee3@dummy.com", "gender": "FEMALE", "birth_year": 1992},
    {"name": "Dian Permata",   "email": "referee4@dummy.com", "gender": "FEMALE", "birth_year": 1988},
]


def get_or_create_referee(profile):
    """Get existing referee or create a new one."""
    user = User.query.filter_by(email=profile["email"]).first()
    if not user:
        user = User(
            name=profile["name"],
            email=profile["email"],
            password=bcrypt.generate_password_hash("password").decode('utf-8'),
            role="REFEREE",
            gender=profile["gender"],
            birth_date=datetime(profile["birth_year"], 6, 15),
            phone=f"+628{random.randint(100000000, 999999999)}",
        )
        db.session.add(user)
        db.session.flush()
    else:
        user.role = "REFEREE"  # ensure role is correct
    return user


def run():
    with app.app_context():
        # --- Clean up old dummy data ---
        print("Cleaning up old dummy data...")
        # Delete in FK-safe order: RefereeApplication → MatchSet → Match → TeamParticipant → Team → Court → Participant → Category → Tournament → dummy referees
        RefereeApplication.query.delete()
        MatchSet.query.delete()
        Match.query.delete()
        TeamParticipant.query.delete()
        Team.query.delete()
        Court.query.delete()
        Participant.query.delete()
        Category.query.delete()
        Tournament.query.delete()
        # Remove old dummy referees so they can be recreated cleanly
        User.query.filter(User.email.in_([p["email"] for p in REFEREE_PROFILES])).delete(synchronize_session='fetch')
        db.session.commit()
        print("Old data deleted!\n")

        admin = User.query.filter_by(role='COMMITTEE').first()
        if not admin:
            print("ERROR: No COMMITTEE user found. Run seed.py first.")
            return

        # -- Create dummy referees ---------------------------------------------
        print("Creating dummy referees...")
        referees = [get_or_create_referee(p) for p in REFEREE_PROFILES]
        db.session.commit()
        for r in referees:
            print(f"  [OK] Referee: {r.name} ({r.email})")
        print()

        # ===============================================================
        # Tournament 1: DRAFT — Ready to START Round-Robin
        # ===============================================================
        print("=" * 70)
        print(" Creating Tournament 1: Ready to Start Round-Robin")
        print("=" * 70)

        # Use future dates so auto-finish doesn't trigger
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        t1 = Tournament(
            name="Turnamen Merdeka Cup 2026",
            location="GOR Senayan, Jakarta",
            start_date=today + timedelta(days=1),
            end_date=today + timedelta(days=10),
            description="Tournament DRAFT — ready to click Start Tournament and generate round-robin.",
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

        # -- Referee Applications for T1 — all PENDING (awaiting review) -------
        print("  Seeding referee applications for T1 (all PENDING)...")
        for ref in referees:
            ra = RefereeApplication(
                referee_id=ref.id,
                tournament_id=t1.id,
                status='PENDING',
                message=f"I am {ref.name}, ready to serve as referee in this tournament.",
                applied_at=datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
            )
            db.session.add(ra)
        db.session.commit()
        print(f"  [OK] {len(referees)} referee applications (PENDING) seeded for T1\n")

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

                print(f"  [OK] {cat_name}: 8 players")

        db.session.commit()
        print(f"\n  [Stats] Total: {total_players_t1} players across {len(AGE_GROUPS_TO_USE) * len(CATEGORY_TEMPLATES)} categories")
        print(f"  [Stadium]  Tournament ID: {t1.id} — Status: DRAFT — Ready to Start!\n")

        # ===============================================================
        # Tournament 2: ONGOING — Round-Robin FINISHED, ready for Knockout
        # ===============================================================
        print("=" * 70)
        print(" Creating Tournament 2: RR Finished, Ready to Generate Knockout")
        print("=" * 70)

        t2 = Tournament(
            name="Turnamen Pahlawan Open 2026",
            location="GOR Jatidiri, Semarang",
            start_date=today - timedelta(days=5),
            end_date=today + timedelta(days=10),
            description="Round-robin fully completed. Click Generate Knockout Bracket to proceed.",
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

        # -- Referee Applications for T2 — mixed statuses ----------------------
        # ref[0] → ACCEPTED (primary referee, used in matches)
        # ref[1] → ACCEPTED (secondary referee)
        # ref[2] → PENDING  (applied but not yet reviewed)
        # ref[3] → REJECTED (committee declined this one)
        print("  Seeding referee applications for T2 (ACCEPTED/PENDING/REJECTED)...")
        ref_app_statuses = [
            (referees[0], 'ACCEPTED', "Berpengalaman 5 tahun sebagai wasit nasional.", None),
            (referees[1], 'ACCEPTED', "Tersertifikasi BWF Level 2.", None),
            (referees[2], 'PENDING',  "Baru lulus pelatihan wasit daerah.", None),
            (referees[3], 'REJECTED', "Konflik jadwal dengan turnamen lain.", "Jadwal tidak memungkinkan untuk hadir penuh."),
        ]
        accepted_referees = []
        for ref, status, msg, reason in ref_app_statuses:
            reviewed_at = datetime.utcnow() - timedelta(days=3) if status in ('ACCEPTED', 'REJECTED') else None
            reviewed_by_id = admin.id if status in ('ACCEPTED', 'REJECTED') else None
            ra = RefereeApplication(
                referee_id=ref.id,
                tournament_id=t2.id,
                status=status,
                message=msg,
                applied_at=datetime.utcnow() - timedelta(days=random.randint(4, 7)),
                reviewed_at=reviewed_at,
                reviewed_by_id=reviewed_by_id,
                rejection_reason=reason,
            )
            db.session.add(ra)
            if status == 'ACCEPTED':
                accepted_referees.append(ref)
        db.session.commit()
        print(f"  [OK] {len(ref_app_statuses)} referee applications seeded for T2")
        print(f"     ({len(accepted_referees)} ACCEPTED, 1 PENDING, 1 REJECTED)\n")

        total_players_t2 = 0
        total_matches_t2 = 0

        # Track court availability for realistic scheduling
        MATCH_DURATION = timedelta(minutes=40)
        DAILY_START = "09:00"
        DAILY_END = "18:00"
        BREAK_START = "12:00"
        BREAK_END = "13:00"

        rr_base = (today - timedelta(days=5)).replace(hour=9, minute=0)
        court_available = {c.id: rr_base for c in courts2}
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

                        # Rotate through accepted referees
                        assigned_referee = accepted_referees[pair_idx % len(accepted_referees)] if accepted_referees else None

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
                            referee_id=assigned_referee.id if assigned_referee else None,
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
                print(f"  [OK] {cat_name}: 8 players, {cat_matches} matches (all FINISHED)")

        db.session.commit()
        
        # Pre-generate knockout placeholder matches because T2 is 'ONGOING' and ready for knockout!
        ko_matches = pre_generate_knockout_matches(t2.id, court_available, groups_by_cat)
        if ko_matches:
            db.session.add_all(ko_matches)
            db.session.commit()
            print(f"  [OK] Pre-generated {len(ko_matches)} knockout placeholder matches!")

        print(f"\n  [Stats] Total: {total_players_t2} players, {total_matches_t2} matches")
        print(f"  [Stadium]  Tournament ID: {t2.id} — Status: ONGOING — Ready for Knockout!\n")

        # ===============================================================
        # Helper: build one Open-category tournament (RR done, ready for KO)
        # ===============================================================
        def build_open_knockout_ready_tournament(name, location, description, start_offset_days):
            """
            Create a tournament with OPEN Men's Singles (32 players) +
            OPEN Men's Doubles (32 teams / 64 players). All round-robin
            matches are FINISHED and placeholder knockout matches are seeded.
            Returns (tournament, total_players, total_matches).
            """
            open_min, open_max = AGE_GROUP_MAP["OPEN"]
            t = Tournament(
                name=name,
                location=location,
                start_date=today - timedelta(days=start_offset_days),
                end_date=today + timedelta(days=14),
                description=description,
                status="ONGOING",
                current_stage="GROUP",
                match_duration_minutes=40,
                daily_start_time="08:00",
                daily_end_time="20:00",
                break_start_time="12:00",
                break_end_time="13:00",
                created_by_id=admin.id,
            )
            db.session.add(t)
            db.session.commit()

            # 6 courts for the larger tournament
            for i in range(1, 7):
                db.session.add(Court(name=f"Court {i}", tournament_id=t.id))
            db.session.commit()
            courts = Court.query.filter_by(tournament_id=t.id).order_by(Court.id).all()

            # Referee applications
            for idx, ref in enumerate(referees):
                status = 'ACCEPTED' if idx < 2 else 'PENDING'
                ra = RefereeApplication(
                    referee_id=ref.id,
                    tournament_id=t.id,
                    status=status,
                    message=f"Permohonan dari {ref.name} untuk turnamen ini.",
                    applied_at=datetime.utcnow() - timedelta(days=random.randint(5, 10)),
                    reviewed_at=datetime.utcnow() - timedelta(days=3) if status == 'ACCEPTED' else None,
                    reviewed_by_id=admin.id if status == 'ACCEPTED' else None,
                )
                db.session.add(ra)
            db.session.commit()
            accepted_refs = referees[:2]

            rr_base = (today - timedelta(days=start_offset_days)).replace(hour=8, minute=0, second=0)
            court_avail = {c.id: rr_base for c in courts}
            groups_by_cat = {}
            total_players = 0
            total_matches = 0

            for cat_type, make_fn, count, label in [
                ("SINGLE", make_single_team, 32, "Men's Singles"),
                ("DOUBLE", make_double_team, 32, "Men's Doubles"),
            ]:
                cat = Category(
                    name=f"Open {label}",
                    gender="MALE",
                    level="OPEN",
                    category_type=cat_type,
                    min_age=open_min,
                    max_age=open_max,
                    tournament_id=t.id,
                )
                db.session.add(cat)
                db.session.commit()

                teams = []
                for _ in range(count):
                    teams.append(make_fn("MALE", t, cat, "OPEN"))
                db.session.commit()

                player_count = count if cat_type == "SINGLE" else count * 2
                total_players += player_count

                random.shuffle(teams)
                groups = assign_groups(teams, target_size=4)  # 8 groups of 4
                groups_by_cat[cat.id] = groups
                for code, grp_teams in groups.items():
                    for team in grp_teams:
                        team.group_code = code
                db.session.commit()

                cat_matches = 0
                for group_code, grp_teams in groups.items():
                    pairs = generate_rr_pairs(grp_teams)
                    for pair_idx, (team_a, team_b) in enumerate(pairs):
                        round_num = (pair_idx // 2) + 1
                        best_court_id = min(court_avail, key=court_avail.get)
                        raw_time = court_avail[best_court_id]
                        scheduled = resolve_slot(raw_time, "08:00", "20:00", "12:00", "13:00")
                        winner = random.choice([team_a, team_b])
                        match_len = timedelta(minutes=random.randint(25, 48))
                        assigned_ref = accepted_refs[pair_idx % len(accepted_refs)]
                        m = Match(
                            round=round_num,
                            group_code=group_code,
                            stage='GROUP',
                            scheduled_at=scheduled,
                            started_at=scheduled,
                            finished_at=scheduled + match_len,
                            status='FINISHED',
                            tournament_id=t.id,
                            category_id=cat.id,
                            home_team_id=team_a.id,
                            away_team_id=team_b.id,
                            winner_team_id=winner.id,
                            court_id=best_court_id,
                            referee_id=assigned_ref.id,
                            home_score=2 if winner.id == team_a.id else 0,
                            away_score=2 if winner.id == team_b.id else 0,
                            finish_reason='NORMAL',
                        )
                        db.session.add(m)
                        db.session.flush()
                        court_avail[best_court_id] = scheduled + MATCH_DURATION
                        for set_num in range(1, 3):
                            w_score, l_score = random_set_score()
                            h, a = (w_score, l_score) if winner.id == team_a.id else (l_score, w_score)
                            db.session.add(MatchSet(
                                match_id=m.id, set_number=set_num,
                                home_score=h, away_score=a,
                            ))
                        cat_matches += 1

                total_matches += cat_matches
                print(f"  [OK] Open {label}: {count} {'players' if cat_type == 'SINGLE' else 'teams'} "
                      f"({player_count} participants), {cat_matches} matches (all FINISHED)")

            db.session.commit()

            # Placeholder knockout bracket
            ko_matches = pre_generate_knockout_matches(t.id, court_avail, groups_by_cat)
            if ko_matches:
                db.session.add_all(ko_matches)
                db.session.commit()
                print(f"  [OK] Pre-generated {len(ko_matches)} knockout placeholder matches!")

            return t, total_players, total_matches

        # ===============================================================
        # Tournament 3: GOR Bung Karno Open Championship
        # ===============================================================
        print("=" * 70)
        print(" Creating Tournament 3: Open Category — 32 Singles + 32 Doubles")
        print("=" * 70)

        t3, total_players_t3, total_matches_t3 = build_open_knockout_ready_tournament(
            name="GOR Bung Karno Open Championship 2026",
            location="GOR Bung Karno, Jakarta",
            description=(
                "Turnamen Open bergengsi di Jakarta. "
                "Round-robin selesai. Siap generate bracket knockout."
            ),
            start_offset_days=7,
        )
        print(f"\n  [Stats] Total: {total_players_t3} participants, {total_matches_t3} matches")
        print(f"  [Stadium]  Tournament ID: {t3.id} — Status: ONGOING — Ready for Knockout!\n")

        # ===============================================================
        # Tournament 4: Grand Prix Nusantara Open
        # ===============================================================
        print("=" * 70)
        print(" Creating Tournament 4: Open Category — 32 Singles + 32 Doubles")
        print("=" * 70)

        t4, total_players_t4, total_matches_t4 = build_open_knockout_ready_tournament(
            name="Grand Prix Nusantara Open 2026",
            location="GOR Ken Arok, Malang",
            description=(
                "Grand Prix tahunan di Malang. "
                "Babak penyisihan grup telah selesai. Siap lanjut ke fase knockout."
            ),
            start_offset_days=10,
        )
        print(f"\n  [Stats] Total: {total_players_t4} participants, {total_matches_t4} matches")
        print(f"  [Stadium]  Tournament ID: {t4.id} — Status: ONGOING — Ready for Knockout!\n")

        # -- Summary -----------------------------------------------------------
        print("=" * 70)
        print(" DONE! Summary:")
        print(f"   1. '{t1.name}' (ID: {t1.id})")
        print(f"      → Status: DRAFT, {total_players_t1} players")
        print(f"      → Click 'Start Tournament' to begin round-robin")
        print(f"   2. '{t2.name}' (ID: {t2.id})")
        print(f"      → Status: ONGOING, {total_players_t2} players, {total_matches_t2} matches")
        print(f"      → Click 'Generate Knockout' to start the elimination round")
        print(f"   3. '{t3.name}' (ID: {t3.id})")
        print(f"      → Status: ONGOING, {total_players_t3} participants, {total_matches_t3} matches")
        print(f"      → Open: 32 Men's Singles + 32 Men's Doubles teams (8 groups each)")
        print(f"      → Click 'Generate Knockout' to start the elimination round")
        print(f"   4. '{t4.name}' (ID: {t4.id})")
        print(f"      → Status: ONGOING, {total_players_t4} participants, {total_matches_t4} matches")
        print(f"      → Open: 32 Men's Singles + 32 Men's Doubles teams (8 groups each)")
        print(f"      → Click 'Generate Knockout' to start the elimination round")
        print("=" * 70)


if __name__ == '__main__':
    run()

"""
Seed script — creates tournaments across major Indonesian cities.
Run: python seed_two_tournaments.py
Requires: seed.py run first (creates COMMITTEE user).
"""

from app import app
from extensions import db, bcrypt
from models import (
    Tournament, Category, User, Participant, Team, TeamParticipant,
    Match, MatchSet, Court, RefereeApplication
)
from services.age_rules import AGE_GROUP_MAP
from routes.schedule import resolve_slot, pre_generate_knockout_matches
from datetime import datetime, timedelta
import random
import math

# ---------------------------------------------------------------------------
# Name pools
# ---------------------------------------------------------------------------
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
    "Nadia", "Ocha", "Prisa", "Ratna", "Sari", "Tina", "Umi",
]
LAST_NAMES = [
    "Santoso", "Wijaya", "Kusuma", "Hidayat", "Sukamuljo", "Gideon",
    "Christie", "Ginting", "Susanti", "Polii", "Rahayu", "Setiawan",
    "Prasetyo", "Cahyono", "Wibowo", "Saputra", "Nugroho", "Darmawan",
    "Firmansyah", "Hartono", "Irawan", "Junanto", "Kurniawan",
]

_counter = [9000]


def _next():
    _counter[0] += 1
    return _counter[0]


def birth_date_for_age(age):
    return datetime(2026 - age - 1, random.randint(1, 6), random.randint(1, 28))


# ---------------------------------------------------------------------------
# Entity helpers
# ---------------------------------------------------------------------------

def make_player(gender, tournament_id, category_id):
    c = _next()
    fn = random.choice(FIRST_NAMES_M if gender == "MALE" else FIRST_NAMES_F)
    ln = random.choice(LAST_NAMES)
    p = Participant(
        full_name=f"{fn} {ln} {c}",
        birth_date=birth_date_for_age(random.randint(15, 35)),
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


def make_single_team(gender, tournament, category):
    p = make_player(gender, tournament.id, category.id)
    team = Team(name=p.full_name, tournament_id=tournament.id, category_id=category.id)
    db.session.add(team)
    db.session.flush()
    db.session.add(TeamParticipant(team_id=team.id, participant_id=p.id))
    return team


def make_double_team(gender, tournament, category):
    p1 = make_player(gender, tournament.id, category.id)
    p2 = make_player(gender, tournament.id, category.id)
    team = Team(
        name=f"{p1.full_name.split()[0]}/{p2.full_name.split()[0]}",
        tournament_id=tournament.id,
        category_id=category.id,
    )
    db.session.add(team)
    db.session.flush()
    db.session.add(TeamParticipant(team_id=team.id, participant_id=p1.id))
    db.session.add(TeamParticipant(team_id=team.id, participant_id=p2.id))
    return team


def generate_rr_pairs(teams):
    pairs = []
    tl = list(teams)
    if len(tl) % 2 == 1:
        tl.append(None)
    n = len(tl)
    for _ in range(n - 1):
        for i in range(n // 2):
            a, b = tl[i], tl[n - 1 - i]
            if a and b:
                pairs.append((a, b))
        tl = [tl[0]] + [tl[-1]] + tl[1:-1]
    return pairs


def assign_groups(teams, target_size=4):
    n = len(teams)
    num_groups = max(1, math.ceil(n / target_size))
    base = n // num_groups
    extra = n % num_groups
    groups = {}
    idx = 0
    for g in range(num_groups):
        code = chr(ord('A') + g)
        size = base + (1 if g < extra else 0)
        groups[code] = teams[idx:idx + size]
        idx += size
    return groups


def random_set_score_for(point_system, is_womens_singles=False):
    """Return (winner_score, loser_score) — valid for the given system."""
    if point_system == 'RALLY_21':
        return 21, random.randint(5, 19)
    if point_system == 'RALLY_15':
        return 15, random.randint(4, 13)
    if point_system == 'CLASSIC':
        win_t = 11 if is_womens_singles else 15
        if random.random() < 0.2:
            # setting invoked at (win_t-1)-(win_t-1) → winner needs 2 more
            return win_t + 2, random.choice([win_t - 1, win_t, win_t + 1])
        # normal win; loser must not have reached win_t-1 (no tie to trigger setting)
        return win_t, random.randint(0, win_t - 2)
    return 21, random.randint(5, 19)


# ---------------------------------------------------------------------------
# Referees
# ---------------------------------------------------------------------------

REFEREE_PROFILES = [
    {"name": "Ahmad Fauzi",    "email": "referee1@dummy.com", "gender": "MALE",   "birth_year": 1985},
    {"name": "Budi Hartono",   "email": "referee2@dummy.com", "gender": "MALE",   "birth_year": 1990},
    {"name": "Citra Dewi",     "email": "referee3@dummy.com", "gender": "FEMALE", "birth_year": 1992},
    {"name": "Dian Permata",   "email": "referee4@dummy.com", "gender": "FEMALE", "birth_year": 1988},
]


def get_or_create_referee(profile):
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
        user.role = "REFEREE"
    return user


# ---------------------------------------------------------------------------
# Core: run round-robin for pre-created teams, return groups dict
# ---------------------------------------------------------------------------

MATCH_DURATION = timedelta(minutes=40)


def _run_rr(t, cat, teams, courts, refs, start_dt, point_system):
    """
    Shuffle teams into groups, create all FINISHED RR matches.
    Returns (groups_dict, match_count).
    """
    random.shuffle(teams)
    groups = assign_groups(teams, target_size=4)
    for code, grp in groups.items():
        for team in grp:
            team.group_code = code
    db.session.commit()

    court_avail = {c.id: start_dt for c in courts}
    match_count = 0
    is_ws = cat.gender == "FEMALE" and cat.category_type == "SINGLE"

    for gcode, grp in groups.items():
        for pair_idx, (ta, tb) in enumerate(generate_rr_pairs(grp)):
            round_num = (pair_idx // 2) + 1
            best = min(court_avail, key=court_avail.get)
            sched = resolve_slot(court_avail[best], "08:00", "20:00", "12:00", "13:00")
            winner = random.choice([ta, tb])
            ref = refs[pair_idx % len(refs)] if refs else None
            m = Match(
                round=round_num, group_code=gcode, stage="GROUP",
                scheduled_at=sched, started_at=sched,
                finished_at=sched + timedelta(minutes=random.randint(25, 45)),
                status="FINISHED",
                tournament_id=t.id, category_id=cat.id,
                home_team_id=ta.id, away_team_id=tb.id,
                winner_team_id=winner.id, court_id=best,
                referee_id=ref.id if ref else None,
                home_score=2 if winner.id == ta.id else 0,
                away_score=2 if winner.id == tb.id else 0,
                finish_reason="NORMAL",
            )
            db.session.add(m)
            db.session.flush()
            court_avail[best] = sched + MATCH_DURATION
            for sn in range(1, 3):
                w, l = random_set_score_for(point_system, is_ws)
                h, a = (w, l) if winner.id == ta.id else (l, w)
                db.session.add(MatchSet(match_id=m.id, set_number=sn, home_score=h, away_score=a))
            match_count += 1

    return groups, match_count


# ---------------------------------------------------------------------------
# Tournament builders
# ---------------------------------------------------------------------------

def _add_courts(t, count=4):
    for i in range(1, count + 1):
        db.session.add(Court(name=f"Court {i}", tournament_id=t.id))
    db.session.commit()
    return Court.query.filter_by(tournament_id=t.id).order_by(Court.id).all()


def _add_referee_apps(t, refs, admin):
    for idx, ref in enumerate(refs):
        status = "ACCEPTED" if idx < 2 else "PENDING"
        db.session.add(RefereeApplication(
            referee_id=ref.id, tournament_id=t.id, status=status,
            message=f"Permohonan dari {ref.name}.",
            applied_at=datetime.utcnow() - timedelta(days=random.randint(3, 10)),
            reviewed_at=datetime.utcnow() - timedelta(days=2) if status == "ACCEPTED" else None,
            reviewed_by_id=admin.id if status == "ACCEPTED" else None,
        ))
    db.session.commit()
    return refs[:2]  # accepted referees


def build_draft(name, location, description, point_system, admin, refs, today):
    """DRAFT: Open MS + WS, 8 players each, no matches played."""
    open_min, open_max = AGE_GROUP_MAP["OPEN"]
    t = Tournament(
        name=name, location=location, description=description,
        start_date=today + timedelta(days=random.randint(5, 20)),
        end_date=today + timedelta(days=random.randint(22, 35)),
        status="DRAFT", current_stage=None,
        match_duration_minutes=40,
        daily_start_time="09:00", daily_end_time="18:00",
        break_start_time="12:00", break_end_time="13:00",
        created_by_id=admin.id, point_system=point_system,
    )
    db.session.add(t)
    db.session.commit()
    _add_courts(t, 4)

    for ref in refs:
        db.session.add(RefereeApplication(
            referee_id=ref.id, tournament_id=t.id, status="PENDING",
            message=f"Permohonan dari {ref.name}.",
            applied_at=datetime.utcnow() - timedelta(hours=random.randint(1, 72)),
        ))
    db.session.commit()

    for gender, label in [("MALE", "Men's"), ("FEMALE", "Women's")]:
        cat = Category(
            name=f"Open {label} Singles",
            gender=gender, level="OPEN", category_type="SINGLE",
            min_age=open_min, max_age=open_max, tournament_id=t.id,
        )
        db.session.add(cat)
        db.session.commit()
        for _ in range(8):
            make_single_team(gender, t, cat)
    db.session.commit()

    print(f"  [DRAFT]   {name[:58]:<58} | {point_system}")
    return t


def build_ongoing_small(name, location, description, point_system,
                        admin, refs, today, start_offset=4):
    """ONGOING GROUP: Open MS + WS, 8 players each, all RR FINISHED."""
    open_min, open_max = AGE_GROUP_MAP["OPEN"]
    t = Tournament(
        name=name, location=location, description=description,
        start_date=today - timedelta(days=start_offset),
        end_date=today + timedelta(days=10),
        status="ONGOING", current_stage="GROUP",
        match_duration_minutes=40,
        daily_start_time="08:00", daily_end_time="20:00",
        break_start_time="12:00", break_end_time="13:00",
        created_by_id=admin.id, point_system=point_system,
    )
    db.session.add(t)
    db.session.commit()

    courts = _add_courts(t, 4)
    accepted_refs = _add_referee_apps(t, refs, admin)
    start_dt = (today - timedelta(days=start_offset)).replace(hour=8, minute=0, second=0)
    groups_by_cat = {}
    total_matches = 0

    for gender, label in [("MALE", "Men's"), ("FEMALE", "Women's")]:
        cat = Category(
            name=f"Open {label} Singles",
            gender=gender, level="OPEN", category_type="SINGLE",
            min_age=open_min, max_age=open_max, tournament_id=t.id,
        )
        db.session.add(cat)
        db.session.commit()
        teams = [make_single_team(gender, t, cat) for _ in range(8)]
        db.session.commit()
        groups, mc = _run_rr(t, cat, teams, courts, accepted_refs, start_dt, point_system)
        groups_by_cat[cat.id] = groups
        total_matches += mc

    db.session.commit()
    court_avail = {c.id: today.replace(hour=8) for c in courts}
    ko = pre_generate_knockout_matches(t.id, court_avail, groups_by_cat)
    if ko:
        db.session.add_all(ko)
        db.session.commit()

    print(f"  [ONGOING] {name[:58]:<58} | {point_system} | {total_matches} matches")
    return t


def build_ongoing_large(name, location, description, point_system,
                        admin, refs, today, start_offset=7):
    """ONGOING GROUP: Open MS (32) + MD (32 teams), all RR FINISHED. Flagship."""
    open_min, open_max = AGE_GROUP_MAP["OPEN"]
    t = Tournament(
        name=name, location=location, description=description,
        start_date=today - timedelta(days=start_offset),
        end_date=today + timedelta(days=14),
        status="ONGOING", current_stage="GROUP",
        match_duration_minutes=40,
        daily_start_time="08:00", daily_end_time="20:00",
        break_start_time="12:00", break_end_time="13:00",
        created_by_id=admin.id, point_system=point_system,
    )
    db.session.add(t)
    db.session.commit()

    courts = _add_courts(t, 6)
    accepted_refs = _add_referee_apps(t, refs, admin)
    start_dt = (today - timedelta(days=start_offset)).replace(hour=8, minute=0, second=0)
    groups_by_cat = {}
    total_matches = 0
    total_players = 0

    cat_specs = [
        ("SINGLE", 32, "Open Men's Singles",  "MALE",   make_single_team),
        ("DOUBLE", 32, "Open Men's Doubles",  "MALE",   make_double_team),
    ]

    for cat_type, count, label, gender, make_fn in cat_specs:
        cat = Category(
            name=label, gender=gender, level="OPEN", category_type=cat_type,
            min_age=open_min, max_age=open_max, tournament_id=t.id,
        )
        db.session.add(cat)
        db.session.commit()
        teams = [make_fn(gender, t, cat) for _ in range(count)]
        db.session.commit()
        total_players += count if cat_type == "SINGLE" else count * 2
        groups, mc = _run_rr(t, cat, teams, courts, accepted_refs, start_dt, point_system)
        groups_by_cat[cat.id] = groups
        total_matches += mc

    db.session.commit()
    court_avail = {c.id: today.replace(hour=8) for c in courts}
    ko = pre_generate_knockout_matches(t.id, court_avail, groups_by_cat)
    if ko:
        db.session.add_all(ko)
        db.session.commit()

    print(f"  [ONGOING] {name[:58]:<58} | {point_system}")
    print(f"           32 MS + 32 MD | {total_players} peserta | {total_matches} matches")
    return t


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run():
    with app.app_context():
        print("Membersihkan data lama...")
        RefereeApplication.query.delete()
        MatchSet.query.delete()
        Match.query.delete()
        TeamParticipant.query.delete()
        Team.query.delete()
        Court.query.delete()
        Participant.query.delete()
        Category.query.delete()
        Tournament.query.delete()
        User.query.filter(
            User.email.in_([p["email"] for p in REFEREE_PROFILES])
        ).delete(synchronize_session="fetch")
        db.session.commit()
        print("Selesai!\n")

        admin = User.query.filter_by(role="COMMITTEE").first()
        if not admin:
            print("ERROR: Tidak ada COMMITTEE user. Jalankan seed.py terlebih dahulu.")
            return

        print("Membuat wasit dummy...")
        refs = [get_or_create_referee(p) for p in REFEREE_PROFILES]
        db.session.commit()
        print(f"  {len(refs)} wasit siap\n")

        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        created = []

        # ==============================================================
        # JAKARTA — 3 turnamen
        # ==============================================================
        print("=" * 80)
        print(" JAKARTA (3 turnamen)")
        print("=" * 80)

        created.append(build_ongoing_large(
            name="Jakarta Open Championship 2026 [Rally 21]",
            location="GOR Senayan, Jakarta",
            description=(
                "Turnamen Open terbesar di Jakarta. Sistem poin Rally 21 (BWF Standard). "
                "Babak penyisihan grup selesai, siap lanjut ke fase knockout."
            ),
            point_system="RALLY_21", admin=admin, refs=refs, today=today, start_offset=7,
        ))

        created.append(build_ongoing_large(
            name="Jakarta Premier League 2026 [Rally 15]",
            location="GOR Bung Karno, Jakarta",
            description=(
                "Liga Premier Jakarta menggunakan sistem Rally Point 15 (BWF 2027). "
                "Menang di 15 poin, deuce di 14-14, maksimum 21."
            ),
            point_system="RALLY_15", admin=admin, refs=refs, today=today, start_offset=5,
        ))

        created.append(build_draft(
            name="DKI Jakarta Invitational 2026 [Classic]",
            location="GOR Kelapa Gading, Jakarta",
            description=(
                "Turnamen undangan DKI Jakarta menggunakan sistem Klasik (pindah bola). "
                "Menang di 15, setting di 14-14 (maks 17). Pendaftaran masih dibuka."
            ),
            point_system="CLASSIC", admin=admin, refs=refs, today=today,
        ))

        # ==============================================================
        # BANDUNG — 2 turnamen
        # ==============================================================
        print()
        print("=" * 80)
        print(" BANDUNG (2 turnamen)")
        print("=" * 80)

        created.append(build_ongoing_small(
            name="Bandung Badminton Festival 2026 [Rally 21]",
            location="GOR Pajajaran, Bandung",
            description=(
                "Festival bulu tangkis Bandung tahunan. Sistem Rally Point 21 standar BWF. "
                "Peserta dari seluruh Jawa Barat."
            ),
            point_system="RALLY_21", admin=admin, refs=refs, today=today, start_offset=4,
        ))

        created.append(build_draft(
            name="Piala Kota Bandung 2026 [Rally 15]",
            location="GOR Saparua, Bandung",
            description=(
                "Piala kota Bandung edisi 2026 dengan sistem Rally Point 15 terbaru (BWF 2027). "
                "Daftarkan tim Anda sekarang!"
            ),
            point_system="RALLY_15", admin=admin, refs=refs, today=today,
        ))

        # ==============================================================
        # SURABAYA — 2 turnamen
        # ==============================================================
        print()
        print("=" * 80)
        print(" SURABAYA (2 turnamen)")
        print("=" * 80)

        created.append(build_ongoing_small(
            name="Surabaya Championship 2026 [Classic]",
            location="GOR Wijaya Kusuma, Surabaya",
            description=(
                "Kejuaraan Surabaya dengan sistem Klasik (pindah bola). "
                "Pertandingan penuh intensitas dengan sistem servis tradisional."
            ),
            point_system="CLASSIC", admin=admin, refs=refs, today=today, start_offset=6,
        ))

        created.append(build_draft(
            name="East Java Open 2026 [Rally 21]",
            location="GOR Bung Tomo, Surabaya",
            description=(
                "Turnamen terbuka Jawa Timur — segera dibuka. "
                "Sistem Rally Point 21 standar nasional. Hadiah menarik!"
            ),
            point_system="RALLY_21", admin=admin, refs=refs, today=today,
        ))

        # ==============================================================
        # MEDAN — 1 turnamen
        # ==============================================================
        print()
        print("=" * 80)
        print(" MEDAN (1 turnamen)")
        print("=" * 80)

        created.append(build_ongoing_small(
            name="Turnamen Medan Raya 2026 [Rally 21]",
            location="GOR Serbaguna Medan, Medan",
            description=(
                "Kejuaraan bulutangkis se-Kota Medan. "
                "Rally Point 21 standar nasional. Mewakili semangat Sumatera Utara."
            ),
            point_system="RALLY_21", admin=admin, refs=refs, today=today, start_offset=3,
        ))

        # ==============================================================
        # DENPASAR — 2 turnamen
        # ==============================================================
        print()
        print("=" * 80)
        print(" DENPASAR (2 turnamen)")
        print("=" * 80)

        created.append(build_ongoing_large(
            name="Bali International Open 2026 [Rally 15]",
            location="GOR Lila Bhuana, Denpasar",
            description=(
                "Turnamen internasional Bali menggunakan sistem BWF 2027 (Rally 15). "
                "Peserta dari seluruh Indonesia dan mancanegara!"
            ),
            point_system="RALLY_15", admin=admin, refs=refs, today=today, start_offset=8,
        ))

        created.append(build_draft(
            name="Piala Kota Denpasar 2026 [Classic]",
            location="GOR Ngurah Rai, Denpasar",
            description=(
                "Piala kota Denpasar dengan sistem Klasik bersejarah. "
                "Pertandingan pindah bola yang penuh seni dan strategi."
            ),
            point_system="CLASSIC", admin=admin, refs=refs, today=today,
        ))

        # ==============================================================
        # SEMARANG — 1 turnamen
        # ==============================================================
        print()
        print("=" * 80)
        print(" SEMARANG (1 turnamen)")
        print("=" * 80)

        created.append(build_ongoing_small(
            name="Semarang Grand Prix 2026 [Rally 21]",
            location="GOR Jatidiri, Semarang",
            description=(
                "Grand Prix Semarang — turnamen bergengsi di Kota Atlas. "
                "Sistem Rally Point 21 BWF Standard."
            ),
            point_system="RALLY_21", admin=admin, refs=refs, today=today, start_offset=5,
        ))

        # ==============================================================
        # YOGYAKARTA — 2 turnamen
        # ==============================================================
        print()
        print("=" * 80)
        print(" YOGYAKARTA (2 turnamen)")
        print("=" * 80)

        created.append(build_draft(
            name="Yogyakarta Cultural Cup 2026 [Rally 21]",
            location="GOR Among Rogo, Yogyakarta",
            description=(
                "Cultural Cup Yogyakarta — turnamen budaya yang digelar di jantung Kota Gudeg. "
                "Daftarkan diri sekarang!"
            ),
            point_system="RALLY_21", admin=admin, refs=refs, today=today,
        ))

        created.append(build_ongoing_small(
            name="Sultan's Cup Yogyakarta 2026 [Classic]",
            location="GOR Sultan, Yogyakarta",
            description=(
                "Sultan's Cup — turnamen prestisius Yogyakarta dengan sistem Klasik (pindah bola). "
                "Tradisi, seni, dan kompetisi dalam satu arena."
            ),
            point_system="CLASSIC", admin=admin, refs=refs, today=today, start_offset=4,
        ))

        # ==============================================================
        # MAKASSAR — 1 turnamen
        # ==============================================================
        print()
        print("=" * 80)
        print(" MAKASSAR (1 turnamen)")
        print("=" * 80)

        created.append(build_ongoing_small(
            name="Piala Sulawesi 2026 [Rally 21]",
            location="GOR Sudiang, Makassar",
            description=(
                "Piala Sulawesi — mewakili semangat bulutangkis Indonesia Timur. "
                "Sistem Rally Point 21 standar BWF."
            ),
            point_system="RALLY_21", admin=admin, refs=refs, today=today, start_offset=3,
        ))

        # ==============================================================
        # MALANG — 1 turnamen
        # ==============================================================
        print()
        print("=" * 80)
        print(" MALANG (1 turnamen)")
        print("=" * 80)

        created.append(build_ongoing_small(
            name="Malang Open Championship 2026 [Rally 15]",
            location="GOR Ken Arok, Malang",
            description=(
                "Open Championship Malang edisi perdana dengan sistem Rally 15 BWF 2027. "
                "Menang di 15 poin, deuce di 14-14."
            ),
            point_system="RALLY_15", admin=admin, refs=refs, today=today, start_offset=6,
        ))

        # ==============================================================
        # Summary
        # ==============================================================
        print()
        print("=" * 80)
        print(" SELESAI! Ringkasan:")
        for i, t in enumerate(created, 1):
            print(f"  {i:2d}. [{t.status:7s}] [{t.point_system:8s}] {t.name}")
        print()

        cities = {}
        for t in created:
            city = t.location.split(",")[-1].strip()
            cities.setdefault(city, 0)
            cities[city] += 1
        for city, count in sorted(cities.items()):
            print(f"       {city}: {count} turnamen")
        print()
        print(f"  Total: {len(created)} turnamen di {len(cities)} kota")
        print("=" * 80)


if __name__ == "__main__":
    run()

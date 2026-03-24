"""
Seed script to create 2 dummy tournaments:
1. "Tournament Siap RR" — Ready to start round-robin (ONGOING, has players/teams/courts, no matches yet)
2. "Tournament Siap Knockout" — Round-robin completed, ready to generate knockout bracket
"""
from app import app
from extensions import db
from models import (
    Tournament, Category, User, Participant, Team, TeamParticipant,
    Match, MatchSet, Court
)
from datetime import datetime, timedelta
import random

FIRST_NAMES_M = ["Budi", "Andi", "Joko", "Ryu", "Ken", "Dhani", "Reza", "Taufik", "Kevin", "Marcus", "Jonatan", "Anthony"]
FIRST_NAMES_F = ["Susi", "Sita", "Rina", "Ayu", "Dewi", "Putri", "Lili", "Greysia", "Apriyani", "Maria", "Fitriani"]


def make_player(counter, gender, tournament_id, category_id):
    """Create a Participant and return it."""
    fn = random.choice(FIRST_NAMES_M if gender == "MALE" else FIRST_NAMES_F)
    name = f"{fn} #{counter}"
    p = Participant(
        full_name=name,
        birth_date=datetime(2000, 1, 1),
        gender=gender,
        email=f"seed{counter}@dummy.com",
        phone="08100000000",
        tournament_id=tournament_id,
        category_id=category_id,
        is_active=True,
    )
    db.session.add(p)
    db.session.flush()
    return p


def make_single_team(counter, gender, tournament, category):
    """Create a Team with 1 participant (singles)."""
    p = make_player(counter, gender, tournament.id, category.id)
    team = Team(name=p.full_name, tournament_id=tournament.id, category_id=category.id)
    db.session.add(team)
    db.session.flush()
    db.session.add(TeamParticipant(team_id=team.id, participant_id=p.id))
    return team


def generate_rr_pairs(teams):
    """Generate round-robin pairings for a list of teams, return list of (teamA, teamB)."""
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


def random_set_score():
    """Generate a valid badminton set score (winner always first)."""
    loser = random.randint(5, 19)
    return 21, loser


def run():
    with app.app_context():
        admin = User.query.filter_by(role='COMMITTEE').first()
        if not admin:
            print("ERROR: No COMMITTEE user found. Run seed.py first.")
            return

        referee = User.query.filter_by(role='REFEREE').first()
        counter = 9000  # high number to avoid conflicts with existing players

        # ═══════════════════════════════════════════════════════════════
        # Tournament 1: Ready to START Round-Robin
        # ═══════════════════════════════════════════════════════════════
        print("\n" + "=" * 60)
        print(" Creating Tournament 1: Siap Start Round-Robin")
        print("=" * 60)

        t1 = Tournament(
            name="Turnamen Merdeka Cup",
            location="GOR Senayan",
            start_date=datetime(2026, 4, 1),
            end_date=datetime(2026, 4, 5),
            description="Tournament siap untuk memulai round-robin. Tinggal klik Generate Round-Robin.",
            status="ONGOING",
            current_stage="GROUP",
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
        for i in range(1, 4):
            db.session.add(Court(name=f"Court {i}", tournament_id=t1.id))
        db.session.commit()

        # 1 Category: Men's Singles — 8 players (will form 2 groups of 4)
        cat1 = Category(
            name="Men's Singles", gender="MALE", level="INTERMEDIATE",
            category_type="SINGLE", tournament_id=t1.id,
        )
        db.session.add(cat1)
        db.session.commit()

        for _ in range(8):
            counter += 1
            make_single_team(counter, "MALE", t1, cat1)
        db.session.commit()

        print(f"  ✅ Tournament '{t1.name}' (ID: {t1.id}) — 8 players, 3 courts, ready for RR")

        # ═══════════════════════════════════════════════════════════════
        # Tournament 2: Round-Robin FINISHED, ready for Knockout
        # ═══════════════════════════════════════════════════════════════
        print("\n" + "=" * 60)
        print(" Creating Tournament 2: RR Selesai, Siap Knockout")
        print("=" * 60)

        t2 = Tournament(
            name="Turnamen Pahlawan Open",
            location="GOR Jatidiri",
            start_date=datetime(2026, 3, 20),
            end_date=datetime(2026, 3, 28),
            description="Round-robin sudah selesai. Tinggal generate knockout bracket.",
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

        for i in range(1, 4):
            db.session.add(Court(name=f"Court {i}", tournament_id=t2.id))
        db.session.commit()
        courts2 = Court.query.filter_by(tournament_id=t2.id).order_by(Court.id).all()

        # 1 Category: Men's Singles — 8 players → 2 groups of 4
        cat2 = Category(
            name="Men's Singles", gender="MALE", level="INTERMEDIATE",
            category_type="SINGLE", tournament_id=t2.id,
        )
        db.session.add(cat2)
        db.session.commit()

        t2_teams = []
        for _ in range(8):
            counter += 1
            t2_teams.append(make_single_team(counter, "MALE", t2, cat2))
        db.session.commit()

        # Assign to 2 groups: A (4), B (4)
        random.shuffle(t2_teams)
        group_a = t2_teams[:4]
        group_b = t2_teams[4:]

        for team in group_a:
            team.group_code = 'A'
        for team in group_b:
            team.group_code = 'B'
        db.session.commit()

        print(f"  Group A: {[t.name for t in group_a]}")
        print(f"  Group B: {[t.name for t in group_b]}")

        # Generate round-robin matches and auto-finish them with scores
        base_time = datetime(2026, 3, 20, 9, 0)
        match_num = 0

        for group_code, group_teams in [('A', group_a), ('B', group_b)]:
            pairs = generate_rr_pairs(group_teams)

            for pair_idx, (team_a, team_b) in enumerate(pairs):
                round_num = (pair_idx // 2) + 1
                court = courts2[match_num % len(courts2)]
                scheduled = base_time + timedelta(minutes=40 * match_num)

                # Decide winner randomly, create 2 sets (2-0)
                if random.random() < 0.5:
                    winner = team_a
                else:
                    winner = team_b

                m = Match(
                    round=round_num,
                    group_code=group_code,
                    stage='GROUP',
                    scheduled_at=scheduled,
                    started_at=scheduled,
                    finished_at=scheduled + timedelta(minutes=35),
                    status='FINISHED',
                    tournament_id=t2.id,
                    category_id=cat2.id,
                    home_team_id=team_a.id,
                    away_team_id=team_b.id,
                    winner_team_id=winner.id,
                    court_id=court.id,
                    referee_id=referee.id if referee else None,
                    home_score=2 if winner.id == team_a.id else 0,
                    away_score=2 if winner.id == team_b.id else 0,
                    finish_reason='NORMAL',
                )
                db.session.add(m)
                db.session.flush()

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

                match_num += 1

        db.session.commit()

        total_matches = Match.query.filter_by(tournament_id=t2.id).count()
        print(f"  ✅ Tournament '{t2.name}' (ID: {t2.id}) — {total_matches} group matches all FINISHED")
        print(f"     Ready to generate knockout bracket!")

        print("\n" + "=" * 60)
        print(" DONE! Summary:")
        print(f"   1. '{t1.name}' (ID: {t1.id}) → Start Round-Robin")
        print(f"   2. '{t2.name}' (ID: {t2.id}) → Generate Knockout")
        print("=" * 60)


if __name__ == '__main__':
    run()

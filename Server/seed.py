from app import app
from extensions import db, bcrypt
from models import User, Tournament, Category, Participant, Team, TeamParticipant, Court, Match
from datetime import datetime, timedelta
from faker import Faker
import random

fake = Faker('id_ID')

def seed_data():
    with app.app_context():
        print("Cleaning up database...")
        # Delete in reverse order of dependencies
        db.session.query(Match).delete()
        db.session.query(TeamParticipant).delete()
        db.session.query(Team).delete()
        db.session.query(Participant).delete()
        db.session.query(Court).delete()
        db.session.query(Category).delete()
        db.session.query(Tournament).delete()
        db.session.query(User).delete()
        db.session.commit()
        print("Database cleaned.")

        # ==========================
        # 1. Users
        # ==========================
        print("Creating users...")
        users = []
        
        # Admin
        admin = User(name="Admin Sistem", email="admin@test.com", password=bcrypt.generate_password_hash("password").decode('utf-8'), role="ADMIN")
        users.append(admin)

        # Committee
        committee = User(name="Committee Member", email="committee@test.com", password=bcrypt.generate_password_hash("password").decode('utf-8'), role="COMMITTEE")
        users.append(committee)

        # Referees
        referees = []
        for i in range(5):
            ref = User(name=f"Referee {i+1}", email=f"referee{i+1}@test.com", password=bcrypt.generate_password_hash("password").decode('utf-8'), role="REFEREE")
            referees.append(ref)
            users.append(ref)

        # Players (Registered Users)
        players = []
        for i in range(50):
            player = User(name=fake.name(), email=fake.email(), password=bcrypt.generate_password_hash("password").decode('utf-8'), role="PLAYER")
            players.append(player)
            users.append(player)

        db.session.add_all(users)
        db.session.commit()
        print(f"Created {len(users)} users.")

        # ==========================
        # 2. Tournaments
        # ==========================
        print("Creating tournaments...")
        
        # 2A. Ongoing Tournament (Active Matches)
        t_ongoing = Tournament(
            name="SportHive Winter Championship 2025 (Ongoing)",
            location="Jakarta International Stadium",
            start_date=datetime.now() - timedelta(days=2),
            end_date=datetime.now() + timedelta(days=3),
            description="The biggest winter badminton tournament in Jakarta. Currently running!",
            created_by_id=admin.id,
            status="ONGOING"
        )
        
        # 2B. Draft Tournament (8 Participants, Ready to Start)
        t_draft = Tournament(
            name="Bandung Open 2025 (Ready to Start)",
            location="Gor Arcamanik, Bandung",
            start_date=datetime.now() + timedelta(days=5),
            end_date=datetime.now() + timedelta(days=10),
            description="National level open tournament with exactly 8 players ready for kickoff.",
            created_by_id=committee.id,
            status="DRAFT" # Crucial: DRAFT so admin can click "Start"
        )

        # 2C. Finished Tournament (History)
        t_finished = Tournament(
            name="Bali Summer Slam 2024 (Finished)",
            location="GcG Sports Hall, Bali",
            start_date=datetime.now() - timedelta(days=30),
            end_date=datetime.now() - timedelta(days=25),
            description="A past tournament to showcase match history.",
            created_by_id=admin.id,
            status="FINISHED"
        )

        db.session.add_all([t_ongoing, t_draft, t_finished])
        db.session.commit()

        # ==========================
        # 3. Categories & Courts
        # ==========================
        categories = []
        
        # Ongoing Categories
        c_ongoing_ms = Category(name="Men's Singles Open", gender="MALE", level="ADVANCED", min_age=15, max_age=35, tournament_id=t_ongoing.id)
        
        # Draft Categories
        c_draft_ms = Category(name="Exhibition Singles", gender="MALE", level="INTERMEDIATE", min_age=12, max_age=19, tournament_id=t_draft.id)
        
        # Finished Categories
        c_finished_ms = Category(name="Pro Singles", gender="MALE", level="PROFESSIONAL", min_age=18, max_age=40, tournament_id=t_finished.id)

        categories.extend([c_ongoing_ms, c_draft_ms, c_finished_ms])
        db.session.add_all(categories)

        # Courts
        courts = []
        for i in range(4):
            courts.append(Court(name=f"Court A{i+1}", location_note="Main Hall", tournament_id=t_ongoing.id))
        for i in range(2):
            courts.append(Court(name=f"Court B{i+1}", location_note="Wing B", tournament_id=t_draft.id))
        for i in range(4):
            courts.append(Court(name=f"Court C{i+1}", location_note="Historic Hall", tournament_id=t_finished.id))
        
        db.session.add_all(courts)
        db.session.commit()

        # ==========================
        # 4. Helpers
        # ==========================
        def register_players(tournament_id, category_id, num, start_idx):
            _participants = []
            _teams = []
            for i in range(num):
                user = players[start_idx + i]
                p = Participant(
                    full_name=user.name,
                    birth_date=fake.date_of_birth(minimum_age=18, maximum_age=30),
                    gender="MALE",
                    email=user.email,
                    phone=fake.phone_number(),
                    tournament_id=tournament_id,
                    category_id=category_id,
                    user_id=user.id
                )
                _participants.append(p)
                t = Team(name=user.name, tournament_id=tournament_id, category_id=category_id)
                _teams.append(t)
            
            db.session.add_all(_participants)
            db.session.add_all(_teams)
            db.session.commit()

            # Link
            _tps = []
            for i in range(len(_participants)):
                _tps.append(TeamParticipant(team_id=_teams[i].id, participant_id=_participants[i].id))
            db.session.add_all(_tps)
            db.session.commit()
            return _teams

        print("Registering participants...")
        
        # Team Ongoing: 16 players
        teams_ongoing = register_players(t_ongoing.id, c_ongoing_ms.id, 16, 0)
        
        # Team Draft: EXACTLY 8 players
        teams_draft = register_players(t_draft.id, c_draft_ms.id, 8, 16)
        
        # Team Finished: 8 players
        teams_finished = register_players(t_finished.id, c_finished_ms.id, 8, 24)

        # ==========================
        # 5. Generate Matches
        # ==========================
        print("Generating matches...")
        
        # 5A. Matches for ONGOING (Some finished, some ongoing, some scheduled)
        # Round 16 -> 8 matches
        ongoing_matches = []
        for i in range(8):
            home = teams_ongoing[i * 2]
            away = teams_ongoing[i * 2 + 1]
            status = "SCHEDULED"
            h_score, a_score = None, None
            
            # Mix statuses
            if i < 4: # First 4 Finished
                status = "FINISHED"
                h_score, a_score = random.randint(0, 21), random.randint(0, 21)
            elif i < 6: # Next 2 Ongoing
                status = "ONGOING"
                h_score, a_score = random.randint(0, 15), random.randint(0, 15)
            
            m = Match(
                round=1,
                group_code="R16",
                scheduled_at=datetime.now(),
                status=status,
                home_score=h_score,
                away_score=a_score,
                tournament_id=t_ongoing.id,
                category_id=c_ongoing_ms.id,
                home_team_id=home.id,
                away_team_id=away.id,
                court_id=courts[i % 4].id,
                referee_id=referees[i % len(referees)].id
            )
            ongoing_matches.append(m)
        db.session.add_all(ongoing_matches)
        
        # 5B. Matches for DRAFT
        # DO NOTHING! Admin will click "Start Tournament" to showcase generate.
        
        # 5C. Matches for FINISHED (All done)
        # 4 Quarter Finals
        finished_matches = []
        winners_qf = []
        for i in range(4):
            home = teams_finished[i * 2]
            away = teams_finished[i * 2 + 1]
            # Decide winner
            home_win = random.choice([True, False])
            h_score = 21 if home_win else 15
            a_score = 15 if home_win else 21
            winner = home if home_win else away
            winners_qf.append(winner)
            
            m = Match(
                round=1, 
                group_code="QF",
                scheduled_at=datetime.now() - timedelta(days=5),
                finished_at=datetime.now() - timedelta(days=5),
                status="FINISHED",
                home_score=h_score, away_score=a_score,
                winner_team_id=winner.id,
                tournament_id=t_finished.id,
                category_id=c_finished_ms.id,
                home_team_id=home.id, away_team_id=away.id,
                court_id=courts[6].id, referee_id=referees[0].id
            )
            finished_matches.append(m)
            
        # 2 Semi Finals
        winners_sf = []
        for i in range(2):
            home = winners_qf[i * 2]
            away = winners_qf[i * 2 + 1]
            home_win = random.choice([True, False])
            winner = home if home_win else away
            winners_sf.append(winner)
             
            m = Match(
                round=2, group_code="SF",
                scheduled_at=datetime.now() - timedelta(days=4),
                finished_at=datetime.now() - timedelta(days=4),
                status="FINISHED",
                home_score=21 if home_win else 18, away_score=18 if home_win else 21,
                winner_team_id=winner.id,
                tournament_id=t_finished.id, category_id=c_finished_ms.id,
                home_team_id=home.id, away_team_id=away.id,
                court_id=courts[6].id, referee_id=referees[0].id
            )
            finished_matches.append(m)
            
        # 1 Final
        final_winner = winners_sf[0] # Just pick one
        m_final = Match(
            round=3, group_code="FINAL",
            scheduled_at=datetime.now() - timedelta(days=3),
            finished_at=datetime.now() - timedelta(days=3),
            status="FINISHED",
            home_score=22, away_score=20,
            winner_team_id=final_winner.id,
            tournament_id=t_finished.id, category_id=c_finished_ms.id,
            home_team_id=winners_sf[0].id, away_team_id=winners_sf[1].id,
            court_id=courts[6].id, referee_id=referees[0].id
        )
        finished_matches.append(m_final)
        
        db.session.add_all(finished_matches)
        db.session.commit()

        print("Seed data completed successfully!")

if __name__ == "__main__":
    seed_data()

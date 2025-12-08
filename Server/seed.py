from app import app
from extensions import db, bcrypt
from models import User, Tournament, Category, Participant, Team, TeamParticipant, Court, Match
from datetime import datetime
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
        for i in range(20):
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
        t1 = Tournament(
            name="SportHive Winter Championship 2025",
            location="Jakarta International Stadium",
            start_date=datetime(2025, 2, 10),
            end_date=datetime(2025, 2, 15),
            description="The biggest winter badminton tournament in Jakarta.",
            created_by_id=admin.id,
            status="ONGOING"
        )
        
        t2 = Tournament(
            name="Bandung Open 2025",
            location="Gor Arcamanik, Bandung",
            start_date=datetime(2025, 3, 1),
            end_date=datetime(2025, 3, 5),
            description="National level open tournament.",
            created_by_id=committee.id,
            status="DRAFT"
        )

        db.session.add_all([t1, t2])
        db.session.commit()

        # ==========================
        # 3. Categories & Courts
        # ==========================
        categories = []
        # T1 Categories
        c1 = Category(name="Men's Singles Open", gender="MALE", level="ADVANCED", min_age=15, max_age=35, tournament_id=t1.id)
        c2 = Category(name="Women's Singles Open", gender="FEMALE", level="ADVANCED", min_age=15, max_age=35, tournament_id=t1.id)
        categories.extend([c1, c2])

        # T2 Categories
        c3 = Category(name="U-19 Boys Singles", gender="MALE", level="INTERMEDIATE", min_age=12, max_age=19, tournament_id=t2.id)
        categories.append(c3)

        db.session.add_all(categories)

        # Courts
        courts = []
        for i in range(4):
            courts.append(Court(name=f"Court {i+1}", location_note="Main Hall", tournament_id=t1.id))
        for i in range(2):
            courts.append(Court(name=f"Court {i+1}", location_note="Wing B", tournament_id=t2.id))
        
        db.session.add_all(courts)
        db.session.commit()

        # ==========================
        # 4. Participants & Teams for T1 (Men's Singles)
        # ==========================
        print("Registering participants...")
        participants = []
        teams = []
        
        # Add 16 participants to Men's Singles Open (mix of online and offline)
        # 10 Online
        for i in range(10):
            user = players[i]
            p = Participant(
                full_name=user.name,
                birth_date=fake.date_of_birth(minimum_age=18, maximum_age=30),
                gender="MALE",
                email=user.email,
                phone=fake.phone_number(),
                tournament_id=t1.id,
                category_id=c1.id,
                user_id=user.id
            )
            participants.append(p)
            
            # Create Team (Single Player)
            t = Team(name=user.name, tournament_id=t1.id, category_id=c1.id)
            teams.append(t)
        
        # 6 Offline
        for i in range(6):
            name = fake.name()
            p = Participant(
                full_name=name,
                birth_date=fake.date_of_birth(minimum_age=18, maximum_age=30),
                gender="MALE",
                tournament_id=t1.id,
                category_id=c1.id
            )
            participants.append(p)
             # Create Team
            t = Team(name=name, tournament_id=t1.id, category_id=c1.id)
            teams.append(t)

        db.session.add_all(participants)
        db.session.add_all(teams)
        db.session.commit()

        # Link Participants to Teams
        tps = []
        for i in range(len(participants)):
            tps.append(TeamParticipant(team_id=teams[i].id, participant_id=participants[i].id))
        db.session.add_all(tps)
        db.session.commit()

        # ==========================
        # 5. Matches for T1 (Men's Singles)
        # ==========================
        print("Generating matches...")
        matches_to_add = []
        # Round 1 (8 matches for 16 players)
        # Just random pairings for demo
        import math
        num_matches = 8
        time_slot = datetime(2025, 2, 10, 9, 0)
        
        for i in range(num_matches):
            home_team = teams[i * 2]
            away_team = teams[i * 2 + 1]
            court = courts[i % 4]
            ref = referees[i % len(referees)]
            
            # Mark some as FINISHED, some LIVE, some SCHEDULED
            status = "SCHEDULED"
            h_score = None
            a_score = None
            
            if i < 3: # First 3 finished
                status = "FINISHED"
                h_score = random.randint(0, 21)
                a_score = random.randint(0, 21)
            elif i == 3: # Next 1 live
                status = "ONGOING"
                h_score = random.randint(0, 15)
                a_score = random.randint(0, 15)
                
            m = Match(
                round=1,
                group_code="R16",
                scheduled_at=time_slot,
                status=status,
                home_score=h_score,
                away_score=a_score,
                tournament_id=t1.id,
                category_id=c1.id,
                home_team_id=home_team.id,
                away_team_id=away_team.id,
                court_id=court.id,
                referee_id=ref.id
            )
            matches_to_add.append(m)

        db.session.add_all(matches_to_add)
        db.session.commit()

        print("Seed data completed successfully!")

if __name__ == "__main__":
    seed_data()

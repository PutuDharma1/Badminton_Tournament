from app import app
from extensions import db, bcrypt
from models import User, Tournament, Category, Participant, Team, TeamParticipant, Court, Match
from datetime import datetime

def seed_data():
    with app.app_context():
        print("Deleting old data...")
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
        print("Old data deleted.")

        # ==========================
        # 1. User (Admin, Committee, Referee)
        # ==========================
        admin = User(
            name="Admin Sistem",
            email="admin@sporthive.com",
            password=bcrypt.generate_password_hash("admin123").decode('utf-8'),
            role="ADMIN"
        )
        referee = User(
            name="Referee A",
            email="referee@sporthive.com",
            password=bcrypt.generate_password_hash("ref123").decode('utf-8'),
            role="REFEREE"
        )
        committee = User(
            name="Committee A",
            email="committee@sporthive.com",
            password=bcrypt.generate_password_hash("com123").decode('utf-8'),
            role="COMMITTEE"
        )
        db.session.add_all([admin, referee, committee])
        db.session.commit() # Commit to get IDs

        # ==========================
        # 2. Tournament
        # ==========================
        tournament = Tournament(
            name="SportHive Badminton Championship",
            location="Jakarta Nation Hall",
            start_date=datetime(2025, 2, 10),
            end_date=datetime(2025, 2, 12),
            description="Turnamen resmi SportHive level nasional.",
            created_by_id=admin.id
        )
        db.session.add(tournament)
        db.session.commit()

        # ==========================
        # 3. Category
        # ==========================
        category_u17_boys = Category(
            name="U17 Boys Intermediate",
            gender="MALE",
            level="INTERMEDIATE",
            min_age=13,
            max_age=17,
            tournament_id=tournament.id
        )
        category_u17_girls = Category(
            name="U17 Girls Intermediate",
            gender="FEMALE",
            level="INTERMEDIATE",
            min_age=13,
            max_age=17,
            tournament_id=tournament.id
        )
        db.session.add_all([category_u17_boys, category_u17_girls])
        db.session.commit()

        # ==========================
        # 4. Participants
        # ==========================
        p1 = Participant(
            full_name="Joko Widodo",
            birth_date=datetime(2009, 7, 1),
            gender="MALE",
            email="jokowi@eradigital.com",
            phone="08123456789",
            tournament_id=tournament.id,
            category_id=category_u17_boys.id
        )
        p2 = Participant(
            full_name="Roy Suryo",
            birth_date=datetime(2008, 12, 20),
            gender="MALE",
            email="haters@owi.com",
            phone="0899123456",
            tournament_id=tournament.id,
            category_id=category_u17_boys.id
        )
        p3 = Participant(
            full_name="Megawati Soekarnopoetri",
            birth_date=datetime(2009, 5, 10),
            gender="FEMALE",
            email="megachan@pdip.com",
            phone="0877777777",
            tournament_id=tournament.id,
            category_id=category_u17_girls.id
        )
        db.session.add_all([p1, p2, p3])
        db.session.commit()

        # ==========================
        # 5. Teams (Single = 1 player per team)
        # ==========================
        team1 = Team(
            name="Team Owi",
            tournament_id=tournament.id,
            category_id=category_u17_boys.id
        )
        team2 = Team(
            name="Team Suryo",
            tournament_id=tournament.id,
            category_id=category_u17_boys.id
        )
        team3 = Team(
            name="Team Mega",
            tournament_id=tournament.id,
            category_id=category_u17_girls.id
        )
        db.session.add_all([team1, team2, team3])
        db.session.commit()

        # Link players to teams
        tp1 = TeamParticipant(team_id=team1.id, participant_id=p1.id)
        tp2 = TeamParticipant(team_id=team2.id, participant_id=p2.id)
        tp3 = TeamParticipant(team_id=team3.id, participant_id=p3.id)
        db.session.add_all([tp1, tp2, tp3])
        db.session.commit()

        # ==========================
        # 6. Courts
        # ==========================
        court1 = Court(name="Court 1", location_note="Main Hall A", tournament_id=tournament.id)
        court2 = Court(name="Court 2", location_note="Main Hall B", tournament_id=tournament.id)
        db.session.add_all([court1, court2])
        db.session.commit()

        # ==========================
        # 7. Match (contoh 1 match)
        # ==========================
        match1 = Match(
            round=1,
            group_code="A",
            scheduled_at=datetime(2025, 2, 10, 9, 0),
            status="SCHEDULED",
            tournament_id=tournament.id,
            category_id=category_u17_boys.id,
            home_team_id=team1.id,
            away_team_id=team2.id,
            court_id=court1.id,
            referee_id=referee.id
        )
        db.session.add(match1)
        db.session.commit()

        print("Seed data berhasil dimasukkan!")

if __name__ == "__main__":
    seed_data()

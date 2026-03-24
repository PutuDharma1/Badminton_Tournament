from app import app
from extensions import db
from models import Tournament, Category, User, Participant, Team, TeamParticipant, Match, Court
from datetime import datetime, timedelta
import random

def run_seed():
    with app.app_context():
        print("Creating Dummy Tournament...")
        admin = User.query.filter_by(role='COMMITTEE').first()
        if not admin:
            print("Error: No COMMITTEE user found")
            return
            
        t = Tournament(
            name="Dummy Tournament 4 Groups",
            location="Gelora Bung Karno",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=7),
            status="DRAFT",
            current_stage="GROUP",
            match_duration_minutes=40,
            daily_start_time="09:00",
            daily_end_time="18:00",
            created_by_id=admin.id
        )
        db.session.add(t)
        db.session.commit()

        print("Creating 4 Courts...")
        for i in range(1, 5):
            c = Court(name=f"Court {i}", tournament_id=t.id)
            db.session.add(c)
        db.session.commit()

        print("Creating 5 Categories...")
        categories_data = [
            {"name": "Men's Singles", "gender": "MALE", "type": "SINGLE"},
            {"name": "Women's Singles", "gender": "FEMALE", "type": "SINGLE"},
            {"name": "Men's Doubles", "gender": "MALE", "type": "DOUBLE"},
            {"name": "Women's Doubles", "gender": "FEMALE", "type": "DOUBLE"},
            {"name": "Mixed Doubles", "gender": "MIXED", "type": "DOUBLE"},
        ]

        cats = []
        for d in categories_data:
            c = Category(
                name=d["name"],
                gender=d["gender"],
                level="INTERMEDIATE",
                category_type=d["type"],
                tournament_id=t.id
            )
            db.session.add(c)
            cats.append(c)
        db.session.commit()

        player_counter = 1
        def get_player(gender):
            nonlocal player_counter
            name = f"Dummy Player {player_counter}"
            email = f"dummy{player_counter}@example.com"
            player_counter += 1
            
            p = Participant(
                full_name=name,
                birth_date=datetime(2000, 1, 1),
                gender=gender,
                email=email,
                phone="08123456789",
                tournament_id=t.id,
                user_id=None,
                is_active=True
            )
            db.session.add(p)
            db.session.flush()
            return p

        print("Creating Teams and Participants...")
        for c in cats:
            for i in range(16):
                t_obj = Team(
                    name="TBD",
                    tournament_id=t.id,
                    category_id=c.id,
                    group_code=None
                )
                db.session.add(t_obj)
                db.session.flush()

                if c.category_type == "SINGLE":
                    p = get_player(c.gender)
                    if p:
                        p.category_id = c.id
                        TeamParticipant(team_id=t_obj.id, participant_id=p.id)
                        db.session.add(TeamParticipant(team_id=t_obj.id, participant_id=p.id))
                        t_obj.name = p.full_name
                else:
                    if c.gender == "MIXED":
                        p1 = get_player("MALE")
                        p2 = get_player("FEMALE")
                    else:
                        p1 = get_player(c.gender)
                        p2 = get_player(c.gender)
                    
                    parts = []
                    if p1:
                        p1.category_id = c.id
                        db.session.add(TeamParticipant(team_id=t_obj.id, participant_id=p1.id))
                        parts.append(p1.full_name.split()[0])
                    if p2:
                        p2.category_id = c.id
                        db.session.add(TeamParticipant(team_id=t_obj.id, participant_id=p2.id))
                        parts.append(p2.full_name.split()[0])
                    t_obj.name = " / ".join(parts) if parts else f"Team {i+1}"
        db.session.commit()

        print(f"Success! Dummy tournament '{t.name}' (ID: {t.id}) created and ready for manual scheduling.")

if __name__ == '__main__':
    run_seed()

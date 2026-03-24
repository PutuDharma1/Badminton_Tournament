from app import app
from extensions import db, bcrypt
from models import User, Participant
from datetime import datetime, timedelta
import random

def create_or_update_user(name, email, role, password="password", gender=None, birth_date=None, phone=None):
    user = User.query.filter_by(email=email).first()
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    if not user:
        user = User(name=name, email=email, role=role, password=hashed_password, gender=gender, birth_date=birth_date, phone=phone)
        db.session.add(user)
    else:
        user.name = name
        user.role = role
        user.password = hashed_password
        user.gender = gender
        user.birth_date = birth_date
        user.phone = phone
    return user

with app.app_context():
    # 1. Unlink participants from old players
    old_players = User.query.filter_by(role='PLAYER').all()
    old_player_ids = [p.id for p in old_players]
    
    if old_player_ids:
        parts = Participant.query.filter(Participant.user_id.in_(old_player_ids)).all()
        for p in parts:
            p.user_id = None
        db.session.commit()

    # 2. Delete old players (except player@test.com which we will recreate/update)
    for p in old_players:
        if p.email != 'player@test.com':
            # Also need to unlink referee from matches if they are mistakenly assigned, though they are 'PLAYER'
            db.session.delete(p)
            
    db.session.commit()

    # 3. Create main accounts
    create_or_update_user("Committee Admin", "committee@test.com", "COMMITTEE")
    create_or_update_user("Test Referee", "referee@test.com", "REFEREE")
    create_or_update_user("Test Player", "player@test.com", "PLAYER", birth_date=datetime(2000, 1, 1), gender="MALE")

    # 4. Create 60 dummy players
    first_names_m = ["Budi", "Andi", "Joko", "Ryu", "Ken", "Dhani", "Reza", "Taufik", "Kevin", "Marcus", "Jonatan", "Anthony"]
    first_names_f = ["Susi", "Sita", "Rina", "Ayu", "Dewi", "Putri", "Lili", "Greysia", "Apriyani", "Maria", "Fitriani"]
    last_names = ["Santoso", "Wijaya", "Kusuma", "Hidayat", "Sukamuljo", "Gideon", "Christie", "Ginting", "Susanti", "Polii", "Rahayu", "Setiawan"]

    for i in range(1, 61):
        gender = random.choice(["MALE", "FEMALE"])
        if gender == "MALE":
            fn = random.choice(first_names_m)
        else:
            fn = random.choice(first_names_f)
        ln = random.choice(last_names)
        
        name = f"{fn} {ln} {i}"
        email = f"player{i}@dummy.com"
        
        # Age between 10 and 25
        age = random.randint(10, 25)
        days_offset = random.randint(0, 365)
        # Using 2026 as current year based on local time
        birth_year = 2026 - age
        birth_date = datetime(birth_year, 1, 1) + timedelta(days=days_offset)
        
        phone = f"+628{random.randint(100000000, 999999999)}"
        
        user = User(
            name=name,
            email=email,
            password=bcrypt.generate_password_hash("password").decode('utf-8'),
            role='PLAYER',
            birth_date=birth_date,
            gender=gender,
            phone=phone
        )
        db.session.add(user)

    db.session.commit()
    print("Database seeded successfully with 3 main accounts and 60 dummy players.")

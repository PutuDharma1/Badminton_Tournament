from extensions import db
from datetime import datetime
from sqlalchemy.orm import relationship

class User(db.Model):
    __tablename__ = 'User'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default='COMMITTEE')
    created_at = db.Column(db.DateTime, default=db.func.now())
    
    tournaments = db.relationship('Tournament', backref='created_by', lazy=True)

class Tournament(db.Model):
    __tablename__ = 'Tournament'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    location = db.Column(db.String(255), nullable=False)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey('User.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.now())
    status = db.Column(db.String(50), default='DRAFT') # DRAFT, ONGOING, FINISHED

    categories = db.relationship('Category', backref='tournament', lazy=True)
    matches = db.relationship('Match', backref='tournament', lazy=True)
    participants = db.relationship('Participant', backref='tournament', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'location': self.location,
            'startDate': self.start_date.isoformat() if self.start_date else None,
            'endDate': self.end_date.isoformat() if self.end_date else None,
            'description': self.description,
            'createdById': self.created_by_id,
            'status': self.status,
            'categories': [c.to_dict() for c in self.categories],
            'participants': [p.to_dict() for p in self.participants], # Uses the backref 'participants' which needs to be defined in Participant model or via backref in Category?
            # Wait, Participant has tournament_id. Let's check the relationship reversed.
            # In Participant model: tournament = db.relationship('Tournament', backref='participants') is NOT defined explicitly in the snippets I saw.
            # In models.py view, Participant has NO relationship back to Tournament explicitly defined, but Tournament has NO relationship defined for participants?
            # Wait, let me check models.py again.
            'matches': [m.to_dict() for m in self.matches]
        }

class Category(db.Model):
    __tablename__ = 'Category'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    gender = db.Column(db.String(50), nullable=False) # MALE, FEMALE, MIXED
    level = db.Column(db.String(50), nullable=False)  # BEGINNER, INTERMEDIATE, ADVANCED, PROFESSIONAL
    min_age = db.Column(db.Integer, nullable=True)
    max_age = db.Column(db.Integer, nullable=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('Tournament.id'), nullable=False)

    participants = db.relationship('Participant', backref='category', lazy=True)
    teams = db.relationship('Team', backref='category', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'gender': self.gender,
            'level': self.level,
            'minAge': self.min_age,
            'maxAge': self.max_age,
            'tournamentId': self.tournament_id
        }

class Participant(db.Model):
    __tablename__ = 'Participant'
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(255), nullable=False)
    birth_date = db.Column(db.DateTime, nullable=False)
    gender = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('Tournament.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('Category.id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('User.id'), nullable=True)
    
    user = db.relationship('User', backref='participants', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "fullName": self.full_name,
            "birthDate": self.birth_date.isoformat() if self.birth_date else None,
            "gender": self.gender,
            "email": self.email,
            "phone": self.phone,
            "isActive": self.is_active,
            "tournamentId": self.tournament_id,
            "categoryId": self.category_id,
            "userId": self.user_id,
            "user": {"name": self.user.name, "email": self.user.email} if self.user else None
        }

class Team(db.Model):
    __tablename__ = 'Team'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    tournament_id = db.Column(db.Integer, db.ForeignKey('Tournament.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('Category.id'), nullable=True)

    team_participants = db.relationship('TeamParticipant', backref='team', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'tournamentId': self.tournament_id,
            'categoryId': self.category_id
        }

class TeamParticipant(db.Model):
    __tablename__ = 'TeamParticipant'
    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey('Team.id'), nullable=False)
    participant_id = db.Column(db.Integer, db.ForeignKey('Participant.id'), nullable=False)

    __table_args__ = (db.UniqueConstraint('team_id', 'participant_id', name='_team_participant_uc'),)

class Court(db.Model):
    __tablename__ = 'Court'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    location_note = db.Column(db.String(255), nullable=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('Tournament.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'locationNote': self.location_note,
            'tournamentId': self.tournament_id
        }

class Match(db.Model):
    __tablename__ = 'Match'
    id = db.Column(db.Integer, primary_key=True)
    round = db.Column(db.Integer, nullable=False)
    group_code = db.Column(db.String(50), nullable=True)
    scheduled_at = db.Column(db.DateTime, nullable=True)
    started_at = db.Column(db.DateTime) 
    finished_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(50), default='SCHEDULED') # SCHEDULED, ONGOING, FINISHED
    home_score = db.Column(db.Integer, default=0)
    away_score = db.Column(db.Integer, default=0)

    tournament_id = db.Column(db.Integer, db.ForeignKey('Tournament.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('Category.id'), nullable=False)
    court_id = db.Column(db.Integer, db.ForeignKey('Court.id'), nullable=True)
    home_team_id = db.Column(db.Integer, db.ForeignKey('Team.id'), nullable=False)
    away_team_id = db.Column(db.Integer, db.ForeignKey('Team.id'), nullable=False)
    winner_team_id = db.Column(db.Integer, db.ForeignKey('Team.id'), nullable=True)
    referee_id = db.Column(db.Integer, db.ForeignKey('User.id'), nullable=True)
    
    home_team = db.relationship('Team', foreign_keys=[home_team_id], backref='home_matches')
    away_team = db.relationship('Team', foreign_keys=[away_team_id], backref='away_matches')
    winner_team = db.relationship('Team', foreign_keys=[winner_team_id], backref='won_matches')
    winner_team = db.relationship('Team', foreign_keys=[winner_team_id], backref='won_matches')
    court = db.relationship('Court', backref='matches')
    referee = db.relationship('User', backref='officiated_matches')
    category = db.relationship('Category', backref='matches')

    def to_dict(self):
        return {
            "id": self.id,
            "round": self.round,
            "groupCode": self.group_code,
            "scheduledAt": self.scheduled_at.isoformat() if self.scheduled_at else None,
            "status": self.status,
            "homeScore": self.home_score,
            "awayScore": self.away_score,
            "categoryId": self.category_id,
            "courtId": self.court_id,
            "category": {"name": self.category.name} if self.category else None,
            "court": {"name": self.court.name} if self.court else None,
            # Handle potential None for teams if verification data is partial
            "homeTeam": {"name": self.home_team.name} if self.home_team else None,
            "awayTeam": {"name": self.away_team.name} if self.away_team else None,
            "winnerTeamId": self.winner_team_id
        }

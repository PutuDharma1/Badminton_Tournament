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
    birth_date = db.Column(db.DateTime, nullable=True)
    gender = db.Column(db.String(50), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
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
    current_stage = db.Column(db.String(20), default='GROUP')  # GROUP, KNOCKOUT, FINISHED
    registration_deadline = db.Column(db.DateTime, nullable=True)  # optional deadline for player registration

    # ── Schedule configuration ─────────────────────────────────────────────
    daily_start_time       = db.Column(db.String(5),  default='09:00')  # 'HH:MM'
    daily_end_time         = db.Column(db.String(5),  default='18:00')  # 'HH:MM'
    match_duration_minutes = db.Column(db.Integer,    default=40)        # minutes
    break_start_time       = db.Column(db.String(5),  nullable=True)     # 'HH:MM' or None
    break_end_time         = db.Column(db.String(5),  nullable=True)     # 'HH:MM' or None

    categories = db.relationship('Category', backref='tournament', lazy=True, cascade='all, delete-orphan')
    matches = db.relationship('Match', backref='tournament', lazy=True, cascade='all, delete-orphan')
    participants = db.relationship('Participant', backref='tournament', lazy=True, cascade='all, delete-orphan')

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
            'currentStage': self.current_stage,
            'dailyStartTime': self.daily_start_time,
            'dailyEndTime': self.daily_end_time,
            'matchDurationMinutes': self.match_duration_minutes,
            'breakStartTime': self.break_start_time,
            'breakEndTime': self.break_end_time,
            'registrationDeadline': self.registration_deadline.isoformat() if self.registration_deadline else None,
            'categories': [c.to_dict() for c in self.categories],
            'matches': [m.to_dict() for m in self.matches]
        }


class Category(db.Model):
    __tablename__ = 'Category'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    gender = db.Column(db.String(50), nullable=False) # MALE, FEMALE, MIXED
    level = db.Column(db.String(50), nullable=False)  # BEGINNER, INTERMEDIATE, ADVANCED, PROFESSIONAL
    category_type = db.Column(db.String(50), default='SINGLE') # SINGLE, DOUBLE
    min_age = db.Column(db.Integer, nullable=True)
    max_age = db.Column(db.Integer, nullable=True)
    max_participants = db.Column(db.Integer, nullable=True)  # None = unlimited
    tournament_id = db.Column(db.Integer, db.ForeignKey('Tournament.id'), nullable=False)

    participants = db.relationship('Participant', backref='category', lazy=True)
    teams = db.relationship('Team', backref='category', lazy=True)

    def to_dict(self):
        from models import Team
        team_count = Team.query.filter_by(category_id=self.id).count()
        return {
            'id': self.id,
            'name': self.name,
            'gender': self.gender,
            'level': self.level,
            'categoryType': self.category_type,
            'minAge': self.min_age,
            'maxAge': self.max_age,
            'maxParticipants': self.max_participants,
            'participantCount': team_count,
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
        # Look up team info
        tp = TeamParticipant.query.filter_by(participant_id=self.id).first()
        team = None
        if tp:
            team = Team.query.get(tp.team_id)
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
            "teamId": team.id if team else None,
            "teamName": team.name if team else None,
            "user": {"name": self.user.name, "email": self.user.email} if self.user else None
        }

class Team(db.Model):
    __tablename__ = 'Team'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    tournament_id = db.Column(db.Integer, db.ForeignKey('Tournament.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('Category.id'), nullable=True)
    group_code = db.Column(db.String(5), nullable=True)  # 'A', 'B', 'C' …

    team_participants = db.relationship('TeamParticipant', backref='team', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'tournamentId': self.tournament_id,
            'categoryId': self.category_id,
            'groupCode': self.group_code,
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
    stage = db.Column(db.String(20), default='GROUP')  # GROUP, KNOCKOUT
    bracket_position = db.Column(db.Integer, nullable=True)  # seed slot in knockout tree
    scheduled_at = db.Column(db.DateTime, nullable=True)
    started_at = db.Column(db.DateTime) 
    finished_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(50), default='SCHEDULED') 
    
    # home_score dan away_score di sini sekarang merepresentasikan "GAMES/SET WON" (misal: 2-1, 2-0)
    home_score = db.Column(db.Integer, default=0)
    away_score = db.Column(db.Integer, default=0)

    tournament_id = db.Column(db.Integer, db.ForeignKey('Tournament.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('Category.id'), nullable=False)
    court_id = db.Column(db.Integer, db.ForeignKey('Court.id'), nullable=True)
    home_team_id = db.Column(db.Integer, db.ForeignKey('Team.id'), nullable=False)
    away_team_id = db.Column(db.Integer, db.ForeignKey('Team.id'), nullable=False)
    winner_team_id = db.Column(db.Integer, db.ForeignKey('Team.id'), nullable=True)
    retire_team_id = db.Column(db.Integer, db.ForeignKey('Team.id'), nullable=True)  # team that retired/walked out
    finish_reason = db.Column(db.String(20), nullable=True)  # NORMAL, RETIRE, WALKOVER
    referee_id = db.Column(db.Integer, db.ForeignKey('User.id'), nullable=True)
    
    # Tambahkan relasi ini untuk mengambil detail skor per set
    sets = db.relationship('MatchSet', backref='match', lazy=True, cascade="all, delete-orphan")

    home_team = db.relationship('Team', foreign_keys=[home_team_id], backref='home_matches')
    away_team = db.relationship('Team', foreign_keys=[away_team_id], backref='away_matches')
    winner_team = db.relationship('Team', foreign_keys=[winner_team_id], backref='won_matches', overlaps="won_matches")
    retired_team = db.relationship('Team', foreign_keys=[retire_team_id], backref='retired_matches')
    court = db.relationship('Court', backref='matches')
    referee = db.relationship('User', backref='officiated_matches')
    category = db.relationship('Category', backref='matches')

    def to_dict(self):
        return {
            "id": self.id,
            "round": self.round,
            "groupCode": self.group_code,
            "stage": self.stage,
            "bracketPosition": self.bracket_position,
            "scheduledAt": self.scheduled_at.isoformat() if self.scheduled_at else None,
            "startedAt": self.started_at.isoformat() if self.started_at else None,
            "finishedAt": self.finished_at.isoformat() if self.finished_at else None,
            "status": self.status,
            "homeScore": self.home_score,  # Sets/games won
            "awayScore": self.away_score,  # Sets/games won
            "sets": [s.to_dict() for s in self.sets],
            "tournamentId": self.tournament_id,
            "categoryId": self.category_id,
            "courtId": self.court_id,
            "homeTeamId": self.home_team_id,
            "awayTeamId": self.away_team_id,
            "winnerTeamId": self.winner_team_id,
            "refereeId": self.referee_id,
            "category": {"name": self.category.name} if self.category else None,
            "court": {"name": self.court.name} if self.court else None,
            "homeTeam": {"id": self.home_team.id, "name": self.home_team.name} if self.home_team else None,
            "awayTeam": {"id": self.away_team.id, "name": self.away_team.name} if self.away_team else None,
            "referee": {"id": self.referee.id, "name": self.referee.name} if self.referee else None,
            "winnerTeam": {"id": self.winner_team.id, "name": self.winner_team.name} if self.winner_team else None,
            "retireTeamId": self.retire_team_id,
            "retiredTeam": {"id": self.retired_team.id, "name": self.retired_team.name} if self.retired_team else None,
            "finishReason": self.finish_reason,
        }
    
class MatchSet(db.Model):
    __tablename__ = 'MatchSet'
    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.Integer, db.ForeignKey('Match.id'), nullable=False)
    set_number = db.Column(db.Integer, nullable=False)  # 1, 2, atau 3
    home_score = db.Column(db.Integer, default=0)       # Poin tim home di set ini
    away_score = db.Column(db.Integer, default=0)       # Poin tim away di set ini

    def to_dict(self):
        return {
            "id": self.id,
            "matchId": self.match_id,
            "setNumber": self.set_number,
            "homeScore": self.home_score,
            "awayScore": self.away_score
        }
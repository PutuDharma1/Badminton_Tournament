from flask import Blueprint, request, jsonify
from extensions import db, jwt
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Participant, TeamParticipant, Team, User, Tournament
from datetime import datetime
import random
from faker import Faker

participant_blueprint = Blueprint('participant', __name__, url_prefix='/api/participants')
fake = Faker('id_ID')

@participant_blueprint.route('/', methods=['GET'])
def get_participants():
    try:
        tournament_id = request.args.get('tournamentId')
        if tournament_id:
            participants = Participant.query.filter_by(tournament_id=int(tournament_id)).all()
        else:
            participants = Participant.query.all()
        return jsonify([p.to_dict() for p in participants]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@participant_blueprint.route('/', methods=['POST'])
@jwt_required()
def create_participant():
    data = request.get_json()
    
    # Simple validation
    required_fields = ['fullName', 'birthDate', 'gender', 'tournamentId']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        # Convert birthDate string to datetime
        birth_date = datetime.fromisoformat(data['birthDate'].replace('Z', '+00:00'))

        new_participant = Participant(
            full_name=data['fullName'],
            birth_date=birth_date,
            gender=data['gender'],
            email=data.get('email'),
            phone=data.get('phone'),
            tournament_id=int(data['tournamentId']),
            category_id=int(data['categoryId']) if data.get('categoryId') else None
        )
        
        db.session.add(new_participant)
        db.session.flush()  # Get new_participant.id before commit

        # Auto-create a Team for this participant (singles = 1 player per team)
        # Team name matches participant's full name for display purposes
        new_team = Team(
            name=new_participant.full_name,
            tournament_id=new_participant.tournament_id,
            category_id=new_participant.category_id
        )
        db.session.add(new_team)
        db.session.flush()  # Get new_team.id

        # Link participant to team
        team_participant = TeamParticipant(
            team_id=new_team.id,
            participant_id=new_participant.id
        )
        db.session.add(team_participant)

        db.session.commit()
        
        return jsonify(new_participant.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@participant_blueprint.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_participant(id):
    try:
        participant = Participant.query.get(id)
        if not participant:
            return jsonify({"error": "Participant not found"}), 404

        # Delete related TeamParticipant entries
        team_participant_entries = TeamParticipant.query.filter_by(participant_id=id).all()
        for tp in team_participant_entries:
            # Also delete the team itself if it was auto-created (solo team)
            team = Team.query.get(tp.team_id)
            if team and TeamParticipant.query.filter_by(team_id=tp.team_id).count() == 1:
                db.session.delete(team)
            db.session.delete(tp)

        db.session.delete(participant)
        db.session.commit()
        return jsonify({"message": "Participant deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ──────────────────────────────────────────────────────────────────────────────
# Player self-registration endpoints
# ──────────────────────────────────────────────────────────────────────────────

@participant_blueprint.route('/self-register', methods=['POST'])
@jwt_required()
def self_register():
    """
    Allows a logged-in PLAYER to register themselves into a tournament.
    Reads user profile from JWT, prevents duplicate registration.
    """
    current_user_id = int(get_jwt_identity())
    data = request.get_json()

    tournament_id = data.get('tournamentId')
    category_id = data.get('categoryId')

    if not tournament_id:
        return jsonify({"error": "tournamentId is required"}), 400

    try:
        # Verify user exists and is a PLAYER
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        if user.role != 'PLAYER':
            return jsonify({"error": "Only players can self-register"}), 403

        # Verify tournament exists
        tournament = Tournament.query.get(int(tournament_id))
        if not tournament:
            return jsonify({"error": "Tournament not found"}), 404

        # Check tournament is still accepting registrations (DRAFT status)
        if tournament.status not in ('DRAFT',):
            return jsonify({"error": "Tournament is no longer accepting registrations"}), 400

        # Check registration deadline
        if tournament.registration_deadline and datetime.utcnow() > tournament.registration_deadline:
            return jsonify({"error": "Registration deadline has passed"}), 400

        # Prevent duplicate registration
        existing = Participant.query.filter_by(
            user_id=current_user_id,
            tournament_id=int(tournament_id)
        ).first()
        if existing:
            return jsonify({"error": "You are already registered in this tournament"}), 409

        # Create participant from user profile
        new_participant = Participant(
            full_name=user.name,
            birth_date=user.birth_date or datetime.now(),
            gender=user.gender or 'MALE',
            email=user.email,
            phone=user.phone,
            tournament_id=int(tournament_id),
            category_id=int(category_id) if category_id else None,
            user_id=current_user_id
        )
        db.session.add(new_participant)
        db.session.flush()

        # Auto-create Team
        new_team = Team(
            name=new_participant.full_name,
            tournament_id=new_participant.tournament_id,
            category_id=new_participant.category_id
        )
        db.session.add(new_team)
        db.session.flush()

        # Link participant to team
        team_participant = TeamParticipant(
            team_id=new_team.id,
            participant_id=new_participant.id
        )
        db.session.add(team_participant)

        db.session.commit()

        return jsonify({
            "message": "Successfully registered for the tournament",
            "participant": new_participant.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@participant_blueprint.route('/my-tournaments', methods=['GET'])
@jwt_required()
def my_tournaments():
    """
    Returns all tournaments that the logged-in player has joined,
    along with participant details.
    """
    current_user_id = int(get_jwt_identity())

    try:
        # Get all participant records for this user
        participations = Participant.query.filter_by(user_id=current_user_id).all()

        result = []
        for p in participations:
            tournament = Tournament.query.get(p.tournament_id)
            if tournament:
                t_dict = tournament.to_dict()
                t_dict['participantCount'] = Participant.query.filter_by(tournament_id=tournament.id).count()
                t_dict['myParticipant'] = p.to_dict()
                result.append(t_dict)

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@participant_blueprint.route('/seed/<int:count>', methods=['POST'])
def seed_participants(count):
    # Only for dev/testing convenience
    if count not in [4, 8, 16, 32, 64]:
        return jsonify({"error": "Seed count must be 4, 8, 16, 32, or 64"}), 400

    data = request.get_json() or {}
    tournament_id = data.get('tournamentId')
    category_id = data.get('categoryId')

    try:
        from models import Category
        if not tournament_id:
            return jsonify({"error": "tournamentId is required"}), 400

        if not category_id:
            cat = Category.query.filter_by(tournament_id=tournament_id).first()
            if not cat:
                return jsonify({"error": "No categories found for this tournament"}), 400
            category_id = cat.id

        participants = []
        for _ in range(count):
            dob = fake.date_of_birth(minimum_age=15, maximum_age=40)
            full_name = fake.name()
            
            p = Participant(
                full_name=full_name,
                birth_date=dob,
                gender=random.choice(['MALE', 'FEMALE']),
                tournament_id=tournament_id,
                category_id=category_id
            )
            db.session.add(p)
            db.session.flush()

            # Auto-create team
            team = Team(name=full_name, tournament_id=tournament_id, category_id=category_id)
            db.session.add(team)
            db.session.flush()

            tp = TeamParticipant(team_id=team.id, participant_id=p.id)
            db.session.add(tp)
            participants.append(p)
            
        db.session.commit()
        return jsonify({"message": f"Seeded {count} dummy participants with teams"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
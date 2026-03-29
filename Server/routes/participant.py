from flask import Blueprint, request, jsonify
from extensions import db, jwt
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Participant, TeamParticipant, Team, User, Tournament, Category
from datetime import datetime
import random
from faker import Faker
from services.age_rules import calculate_age, is_age_eligible

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
    
    # Check if this is the new payload format (player1, player2) or the old flat format
    try:
        tournament_id = int(data.get('tournamentId'))
        category_id = int(data.get('categoryId')) if data.get('categoryId') else None
        
        # Determine if it's a Double registration
        is_double = 'player2' in data and data['player2'] is not None

        if 'player1' in data:
            p1_data = data['player1']
        else:
            p1_data = data # old format fallback
            
        required_fields = ['fullName', 'birthDate', 'gender']
        if not all(field in p1_data for field in required_fields):
            return jsonify({"error": "Missing required fields for player 1"}), 400
            
        if is_double and not all(field in data['player2'] for field in required_fields):
            return jsonify({"error": "Missing required fields for player 2"}), 400

        # Validate category vs gender
        if category_id:
            from models import Category
            category = Category.query.get(category_id)
            if category and category.gender != 'MIXED':
                c_gender = category.gender.upper()
                g1 = p1_data['gender'].upper()
                if g1 != c_gender:
                    return jsonify({"error": f"Player 1 gender ({g1}) does not match category requirement ({c_gender})"}), 400
                if is_double:
                    g2 = data['player2']['gender'].upper()
                    if g2 != c_gender:
                        return jsonify({"error": f"Player 2 gender ({g2}) does not match category requirement ({c_gender})"}), 400

            # ── Validate age ──────────────────────────────────────────────
            if category:
                def _check_age(player_data, label):
                    try:
                        bd = datetime.fromisoformat(player_data['birthDate'].replace('Z', '+00:00')).date()
                    except Exception:
                        bd = datetime.strptime(player_data['birthDate'][:10], '%Y-%m-%d').date()
                    age = calculate_age(bd)
                    if not is_age_eligible(age, category.min_age, category.max_age):
                        age_range = f"{category.min_age}-{category.max_age}" if category.min_age is not None else "any"
                        return jsonify({"error": f"{label} age ({age}) does not meet category requirement (age range {age_range})"}), 400
                    return None

                err = _check_age(p1_data, "Player 1")
                if err:
                    return err
                if is_double:
                    err = _check_age(data['player2'], "Player 2")
                    if err:
                        return err

            # Check capacity
            if category and category.max_participants:
                current_count = Team.query.filter_by(category_id=category_id).count()
                if current_count >= category.max_participants:
                    return jsonify({"error": f"Category '{category.name}' is full ({current_count}/{category.max_participants} teams)"}), 400


        # Helper to create participant
        def build_participant(p_data):
            return Participant(
                full_name=p_data['fullName'],
                birth_date=datetime.fromisoformat(p_data['birthDate'].replace('Z', '+00:00')),
                gender=p_data['gender'],
                email=p_data.get('email'),
                phone=p_data.get('phone'),
                tournament_id=tournament_id,
                category_id=category_id,
                user_id=p_data.get('userId')
            )

        p1 = build_participant(p1_data)
        db.session.add(p1)
        db.session.flush()

        participants_created = [p1]

        if is_double:
            p2 = build_participant(data['player2'])
            db.session.add(p2)
            db.session.flush()
            participants_created.append(p2)

        # Team name
        if is_double:
            # Often doubles use both last names, but we can just use "Name1 / Name2"
            name1_parts = p1.full_name.split()
            name2_parts = p2.full_name.split()
            last_name1 = name1_parts[-1] if name1_parts else p1.full_name
            last_name2 = name2_parts[-1] if name2_parts else p2.full_name
            team_name = f"{last_name1} / {last_name2}"
        else:
            team_name = p1.full_name

        new_team = Team(
            name=team_name,
            tournament_id=tournament_id,
            category_id=category_id
        )
        db.session.add(new_team)
        db.session.flush()

        # Link participants to team
        for p in participants_created:
            team_participant = TeamParticipant(
                team_id=new_team.id,
                participant_id=p.id
            )
            db.session.add(team_participant)

        db.session.commit()
        
        return jsonify({
            "message": "Participants created successfully",
            "team": new_team.to_dict(),
            "participants": [p.to_dict() for p in participants_created]
        }), 201
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

@participant_blueprint.route('/lookup-partner', methods=['GET'])
@jwt_required()
def lookup_partner():
    """
    Lookup a partner by email for doubles registration.
    Returns partner info if found and valid.
    """
    email = request.args.get('email', '').strip()
    tournament_id = request.args.get('tournamentId')
    current_user_id = int(get_jwt_identity())

    if not email:
        return jsonify({"error": "Email is required"}), 400
    if not tournament_id:
        return jsonify({"error": "tournamentId is required"}), 400

    try:
        # Cannot partner with yourself
        current_user = User.query.get(current_user_id)
        if current_user and current_user.email.lower() == email.lower():
            return jsonify({"error": "You cannot register with yourself as partner"}), 400

        # Find user by email
        partner = User.query.filter(db.func.lower(User.email) == email.lower()).first()
        if not partner:
            return jsonify({"error": "No player found with this email. Make sure they have registered an account."}), 404

        if partner.role != 'PLAYER':
            return jsonify({"error": "This user is not registered as a player"}), 400

        # Check if partner is already registered in this tournament
        existing = Participant.query.filter_by(
            user_id=partner.id,
            tournament_id=int(tournament_id)
        ).first()
        if existing:
            return jsonify({"error": f"{partner.name} is already registered in this tournament"}), 409

        return jsonify({
            "id": partner.id,
            "name": partner.name,
            "email": partner.email,
            "gender": partner.gender,
            "birthDate": partner.birth_date.isoformat() if partner.birth_date else None,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@participant_blueprint.route('/self-register', methods=['POST'])
@jwt_required()
def self_register():
    """
    Allows a logged-in PLAYER to register themselves into a tournament.
    For doubles categories, accepts partnerEmail to register as a pair.
    """
    current_user_id = int(get_jwt_identity())
    data = request.get_json()

    tournament_id = data.get('tournamentId')
    category_id = data.get('categoryId')
    partner_email = data.get('partnerEmail', '').strip() if data.get('partnerEmail') else None

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

        # Verify category and gender
        category = None
        is_doubles = False
        if category_id:
            category = Category.query.get(int(category_id))
            if not category:
                return jsonify({"error": "Category not found"}), 404

            is_doubles = category.category_type == 'DOUBLE'

            if category.gender != 'MIXED' and user.gender and user.gender.upper() != category.gender.upper():
                return jsonify({"error": f"You cannot register for this category. Category requires {category.gender} but your gender is {user.gender}"}), 400

            # ── Validate age ──────────────────────────────────────────────
            if user.birth_date:
                player_age = calculate_age(user.birth_date.date() if hasattr(user.birth_date, 'date') else user.birth_date)
                if not is_age_eligible(player_age, category.min_age, category.max_age):
                    age_range = f"{category.min_age}-{category.max_age}" if category.min_age is not None else "any"
                    return jsonify({"error": f"Your age ({player_age}) does not meet the category requirement (age range {age_range}). Please choose a suitable category."}), 400

            # Check capacity
            if category.max_participants:
                current_count = Team.query.filter_by(category_id=int(category_id)).count()
                if current_count >= category.max_participants:
                    return jsonify({"error": f"Category '{category.name}' is full ({current_count}/{category.max_participants} slots)"}), 400

        # Prevent duplicate registration for self
        existing = Participant.query.filter_by(
            user_id=current_user_id,
            tournament_id=int(tournament_id)
        ).first()
        if existing:
            return jsonify({"error": "You are already registered in this tournament"}), 409

        # ── Doubles: resolve partner ──────────────────────────────────────
        partner_user = None
        if is_doubles:
            if not partner_email:
                return jsonify({"error": "Partner email is required for doubles registration"}), 400

            if user.email.lower() == partner_email.lower():
                return jsonify({"error": "You cannot register with yourself as partner"}), 400

            partner_user = User.query.filter(db.func.lower(User.email) == partner_email.lower()).first()
            if not partner_user:
                return jsonify({"error": "No player found with this email. Make sure they have registered an account."}), 404
            if partner_user.role != 'PLAYER':
                return jsonify({"error": "Partner is not registered as a player"}), 400

            # Prevent duplicate registration for partner
            existing_partner = Participant.query.filter_by(
                user_id=partner_user.id,
                tournament_id=int(tournament_id)
            ).first()
            if existing_partner:
                return jsonify({"error": f"{partner_user.name} is already registered in this tournament"}), 409

            # Validate partner gender for non-MIXED categories
            if category and category.gender != 'MIXED' and partner_user.gender and partner_user.gender.upper() != category.gender.upper():
                return jsonify({"error": f"Partner's gender ({partner_user.gender}) does not match category requirement ({category.gender})"}), 400

            # Validate partner age
            if category and partner_user.birth_date:
                partner_age = calculate_age(partner_user.birth_date.date() if hasattr(partner_user.birth_date, 'date') else partner_user.birth_date)
                if not is_age_eligible(partner_age, category.min_age, category.max_age):
                    age_range = f"{category.min_age}-{category.max_age}" if category.min_age is not None else "any"
                    return jsonify({"error": f"Partner's age ({partner_age}) does not meet the category requirement (age range {age_range})."}), 400

        # ── Create participant(s) ─────────────────────────────────────────
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

        participants_created = [new_participant]

        if is_doubles and partner_user:
            partner_participant = Participant(
                full_name=partner_user.name,
                birth_date=partner_user.birth_date or datetime.now(),
                gender=partner_user.gender or 'MALE',
                email=partner_user.email,
                phone=partner_user.phone,
                tournament_id=int(tournament_id),
                category_id=int(category_id) if category_id else None,
                user_id=partner_user.id
            )
            db.session.add(partner_participant)
            db.session.flush()
            participants_created.append(partner_participant)

        # ── Create Team ───────────────────────────────────────────────────
        if is_doubles and len(participants_created) == 2:
            name1_parts = participants_created[0].full_name.split()
            name2_parts = participants_created[1].full_name.split()
            last_name1 = name1_parts[-1] if name1_parts else participants_created[0].full_name
            last_name2 = name2_parts[-1] if name2_parts else participants_created[1].full_name
            team_name = f"{last_name1} / {last_name2}"
        else:
            team_name = new_participant.full_name

        new_team = Team(
            name=team_name,
            tournament_id=int(tournament_id),
            category_id=int(category_id) if category_id else None
        )
        db.session.add(new_team)
        db.session.flush()

        # Link all participants to team
        for p in participants_created:
            tp = TeamParticipant(
                team_id=new_team.id,
                participant_id=p.id
            )
            db.session.add(tp)

        db.session.commit()

        return jsonify({
            "message": "Successfully registered for the tournament",
            "participant": new_participant.to_dict(),
            "team": new_team.to_dict()
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
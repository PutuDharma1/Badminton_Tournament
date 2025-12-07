from flask import Blueprint, request, jsonify
from extensions import db, jwt
from flask_jwt_extended import jwt_required
from models import Participant, TeamParticipant
from datetime import datetime
import random
from faker import Faker

participant_blueprint = Blueprint('participant', __name__, url_prefix='/api/participants')
fake = Faker('id_ID')

@participant_blueprint.route('/', methods=['GET'])
def get_participants():
    try:
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

        # Manually delete related TeamParticipant records first (generic approach)
        TeamParticipant.query.filter_by(participant_id=id).delete()
        
        db.session.delete(participant)
        db.session.commit()
        return jsonify({"message": "Participant deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@participant_blueprint.route('/seed/<int:count>', methods=['POST'])
def seed_participants(count):
    # Only for dev/testing convenience
    if count not in [16, 32, 64]:
        return jsonify({"error": "Seed count must be 16, 32, or 64"}), 400

    try:
        # Assuming we just pick the first tournament and category for simplicity or it fails
        # In a real app, pass tournamentId in the body
        from models import Category
        categories = Category.query.all()
        
        if not categories:
             return jsonify({"error": "No categories found"}), 400

        participants = []
        for _ in range(count):
            dob = fake.date_of_birth(minimum_age=15, maximum_age=40)
            
            cat = random.choice(categories)
            p = Participant(
                full_name=fake.name(),
                birth_date=dob,
                gender=random.choice(['MALE', 'FEMALE']),
                tournament_id=cat.tournament_id,
                category_id=cat.id
            )
            participants.append(p)
            
        db.session.add_all(participants)
        db.session.commit()
        
        return jsonify({"message": f"Seeded {count} dummy participants"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
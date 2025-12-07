from flask import Blueprint, request, jsonify
from extensions import db
from models import Tournament, Category, Match, Participant
from datetime import datetime
from routes.schedule import generate_round_robin_matches

tournament_blueprint = Blueprint('tournament', __name__, url_prefix='/api/tournaments')

@tournament_blueprint.route('/', methods=['GET'])
def get_tournaments():
    try:
        tournaments = Tournament.query.all()
        return jsonify([t.to_dict() for t in tournaments]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@tournament_blueprint.route('/<int:id>', methods=['GET'])
def get_tournament(id):
    try:
        tournament = Tournament.query.get(id)
        if not tournament:
            return jsonify({"error": "Tournament not found"}), 404
        return jsonify(tournament.to_dict()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@tournament_blueprint.route('/', methods=['POST'])
def create_tournament():
    data = request.get_json()
    
    # Validation
    required_fields = ['name', 'location', 'startDate', 'endDate', 'createdById']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        new_tournament = Tournament(
            name=data['name'],
            location=data['location'],
            start_date=datetime.fromisoformat(data['startDate'].replace('Z', '+00:00')),
            end_date=datetime.fromisoformat(data['endDate'].replace('Z', '+00:00')),
            description=data.get('description', ''),
            created_by_id=data['createdById']
        )
        
        db.session.add(new_tournament)
        db.session.commit()
        
        return jsonify(new_tournament.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@tournament_blueprint.route('/<int:id>', methods=['PUT'])
def update_tournament(id):
    data = request.get_json()
    try:
        tournament = Tournament.query.get(id)
        if not tournament:
            return jsonify({"error": "Tournament not found"}), 404

        if 'name' in data: tournament.name = data['name']
        if 'location' in data: tournament.location = data['location']
        if 'startDate' in data: tournament.start_date = datetime.fromisoformat(data['startDate'].replace('Z', '+00:00'))
        if 'endDate' in data: tournament.end_date = datetime.fromisoformat(data['endDate'].replace('Z', '+00:00'))
        if 'description' in data: tournament.description = data['description']

        db.session.commit()
        return jsonify(tournament.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@tournament_blueprint.route('/<int:id>', methods=['DELETE'])
def delete_tournament(id):
    try:
        tournament = Tournament.query.get(id)
        if not tournament:
            return jsonify({"error": "Tournament not found"}), 404
            
        db.session.delete(tournament)
        db.session.commit()
        return jsonify({"message": "Tournament deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@tournament_blueprint.route('/<int:id>/start', methods=['POST'])
def start_tournament(id):
    # This invokes the scheduling logic
    # Ideally, we should check if it's already started
    # For now, we'll just trigger the schedule generation imports
    try:
        # We need to call the generation logic. 
        # Since schedule logic is in routes/schedule.py, we might need to refactor it to a 'services' folder 
        # or import it. I'll import the function if I can, or call the logic here.
        
        # Checking imports above: from routes.schedule import generate_round_robin_matches
        # Note: Importing from another route file might cause circular imports if not careful.
        # Ideally logic should be in services/match_service.py.
        # But let's try direct import assuming schedule.py doesn't import THIS file.
        
        matches = generate_round_robin_matches(id) 
        
        return jsonify({"message": "Tournament started, matches generated", "matchCount": len(matches)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

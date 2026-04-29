from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models import Court, Tournament
from routes.utils import check_tournament_owner

court_blueprint = Blueprint('court', __name__, url_prefix='/api/courts')

@court_blueprint.route('/', methods=['GET'])
def get_courts():
    tournament_id = request.args.get('tournamentId')
    try:
        query = Court.query
        if tournament_id:
            query = query.filter_by(tournament_id=int(tournament_id))
        courts = query.order_by(Court.id).all()
        return jsonify([c.to_dict() for c in courts]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@court_blueprint.route('/', methods=['POST'])
@jwt_required()
def create_court():
    data = request.get_json()
    tournament_id = data.get('tournamentId')
    name = data.get('name')
    location_note = data.get('locationNote', '')

    if not tournament_id or not name:
        return jsonify({"error": "tournamentId and name are required"}), 400

    try:
        tournament = Tournament.query.get(int(tournament_id))
        if not tournament:
            return jsonify({"error": "Tournament not found"}), 404
        allowed, err = check_tournament_owner(tournament)
        if not allowed:
            return err

        court = Court(
            name=name,
            location_note=location_note,
            tournament_id=int(tournament_id)
        )
        db.session.add(court)
        db.session.commit()
        return jsonify(court.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@court_blueprint.route('/bulk', methods=['POST'])
@jwt_required()
def create_courts_bulk():
    """Create multiple courts for a tournament at once."""
    data = request.get_json()
    tournament_id = data.get('tournamentId')
    count = data.get('count', 1)
    location_note = data.get('locationNote', 'Main Hall')

    if not tournament_id:
        return jsonify({"error": "tournamentId is required"}), 400

    try:
        tournament = Tournament.query.get(int(tournament_id))
        if not tournament:
            return jsonify({"error": "Tournament not found"}), 404
        allowed, err = check_tournament_owner(tournament)
        if not allowed:
            return err

        courts = []
        for i in range(int(count)):
            court = Court(
                name=f"Court {i + 1}",
                location_note=location_note,
                tournament_id=int(tournament_id)
            )
            db.session.add(court)
            courts.append(court)
        db.session.commit()
        return jsonify([c.to_dict() for c in courts]), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@court_blueprint.route('/<int:court_id>', methods=['DELETE'])
@jwt_required()
def delete_court(court_id):
    try:
        court = Court.query.get(court_id)
        if not court:
            return jsonify({"error": "Court not found"}), 404
        tournament = Tournament.query.get(court.tournament_id)
        if tournament:
            allowed, err = check_tournament_owner(tournament)
            if not allowed:
                return err
        db.session.delete(court)
        db.session.commit()
        return jsonify({"message": "Court deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

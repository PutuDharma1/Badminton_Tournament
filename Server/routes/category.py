from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from extensions import db
from models import Category, Team, Participant, Tournament
from routes.utils import check_tournament_owner

category_blueprint = Blueprint('category', __name__, url_prefix='/api/categories')

@category_blueprint.route('/', methods=['GET'])
def get_categories():
    try:
        categories = Category.query.all()
        return jsonify([c.to_dict() for c in categories]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@category_blueprint.route('/tournament/<int:tournament_id>', methods=['GET'])
def get_tournament_categories(tournament_id):
    try:
        categories = Category.query.filter_by(tournament_id=tournament_id).all()
        return jsonify([c.to_dict() for c in categories]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@category_blueprint.route('/age-groups', methods=['GET'])
def get_age_groups():
    """Return available PBSI age groups for the frontend dropdown."""
    from services.age_rules import AGE_GROUPS
    return jsonify(AGE_GROUPS), 200

@category_blueprint.route('/', methods=['POST'])
@jwt_required()
def create_category():
    data = request.get_json()
    required = ['name', 'gender', 'level', 'tournamentId']
    if not all(field in data for field in required):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        # Check tournament
        tournament = Tournament.query.get(data['tournamentId'])
        if not tournament:
            return jsonify({"error": "Tournament not found"}), 404
        allowed, err = check_tournament_owner(tournament)
        if not allowed:
            return err

        # If ageGroup is provided, auto-fill min_age / max_age from rules
        age_group = data.get('ageGroup')
        min_age = data.get('minAge')
        max_age = data.get('maxAge')

        if age_group:
            from services.age_rules import AGE_GROUP_MAP
            if age_group in AGE_GROUP_MAP:
                min_age, max_age = AGE_GROUP_MAP[age_group]
            else:
                return jsonify({"error": f"Unknown age group: {age_group}"}), 400

        new_cat = Category(
            name=data['name'],
            gender=data['gender'],
            level=data['level'],
            category_type=data.get('categoryType', 'SINGLE'),
            min_age=min_age,
            max_age=max_age,
            max_participants=data.get('maxParticipants'),
            tournament_id=data['tournamentId']
        )
        db.session.add(new_cat)
        db.session.commit()
        return jsonify(new_cat.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@category_blueprint.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_category(id):
    try:
        category = Category.query.get(id)
        if not category:
            return jsonify({"error": "Category not found"}), 404
        tournament = Tournament.query.get(category.tournament_id)
        if tournament:
            allowed, err = check_tournament_owner(tournament)
            if not allowed:
                return err

        # Check if participants or matches are tied to this category
        has_participants = Participant.query.filter_by(category_id=id).first()
        if has_participants:
            return jsonify({"error": "Cannot delete category with registered participants."}), 400
            
        Team.query.filter_by(category_id=id).delete()
        db.session.delete(category)
        db.session.commit()
        return jsonify({"message": "Category deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

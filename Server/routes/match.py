# Server/routes/match.py
from flask import Blueprint, jsonify, request
from extensions import db
from models import Match, Team
from sqlalchemy.orm import joinedload

match_blueprint = Blueprint('match', __name__, url_prefix='/api/matches')

@match_blueprint.route('/', methods=['GET'])
def get_matches():
    tournament_id = request.args.get('tournamentId')
    category_id = request.args.get('categoryId')

    query = Match.query

    if tournament_id:
        query = query.filter_by(tournament_id=tournament_id)
    if category_id:
        query = query.filter_by(category_id=category_id)

    # Eager load relationships
    matches = query.options(
        joinedload(Match.home_team),
        joinedload(Match.away_team),
        joinedload(Match.court),
        joinedload(Match.category)
    ).order_by(Match.scheduled_at).all()

    return jsonify([m.to_dict() for m in matches]), 200

@match_blueprint.route('/<int:match_id>/score', methods=['PUT'])
def update_score(match_id):
    data = request.get_json()
    
    home_score = data.get('homeScore')
    away_score = data.get('awayScore')
    
    # Optional logic: determine winner automatically? 
    # For now, just update scores and mark status.
    
    try:
        match = Match.query.get(match_id)
        if not match:
            return jsonify({"error": "Match not found"}), 404
            
        match.home_score = home_score
        match.away_score = away_score
        match.status = 'FINISHED' # Auto set match status to finished
        match.finished_at = db.func.now()

        # Determine winner
        if home_score > away_score:
            match.winner_team_id = match.home_team_id
        elif away_score > home_score:
            match.winner_team_id = match.away_team_id
        else:
             # Draw? or just leave winner null
             match.winner_team_id = None

        db.session.commit()
        return jsonify(match.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
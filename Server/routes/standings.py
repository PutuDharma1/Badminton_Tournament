from flask import Blueprint, jsonify, request
from extensions import db
from models import Team, Match

standings_blueprint = Blueprint('standings', __name__, url_prefix='/api/standings')

@standings_blueprint.route('/', methods=['GET'])
def get_standings():
    tournament_id = request.args.get('tournamentId')
    category_id = request.args.get('categoryId')
    
    if not tournament_id or not category_id:
        return jsonify({"error": "TournamentId and CategoryId required"}), 400

    try:
        teams = Team.query.filter_by(tournament_id=tournament_id, category_id=category_id).all()
        matches = Match.query.filter_by(
            tournament_id=tournament_id, 
            category_id=category_id, 
            status='FINISHED'
        ).all()
        
        standings = {}
        for team in teams:
            standings[team.id] = {
                "teamId": team.id,
                "teamName": team.name,
                "played": 0,
                "won": 0,
                "lost": 0,
                "points": 0
            }
            
        for m in matches:
            if m.winner_team_id:
                # Winner
                if m.winner_team_id in standings:
                    standings[m.winner_team_id]["played"] += 1
                    standings[m.winner_team_id]["won"] += 1
                    standings[m.winner_team_id]["points"] += 3
                
                # Loser (The other team)
                loser_id = m.away_team_id if m.winner_team_id == m.home_team_id else m.home_team_id
                if loser_id in standings:
                    standings[loser_id]["played"] += 1
                    standings[loser_id]["lost"] += 1
                    # standings[loser_id]["points"] += 0

        # Sort by points
        sorted_standings = sorted(standings.values(), key=lambda x: x['points'], reverse=True)
        
        return jsonify(sorted_standings), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
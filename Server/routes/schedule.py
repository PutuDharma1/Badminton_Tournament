from flask import Blueprint, jsonify, request
from flask import Blueprint, jsonify, request
from extensions import db
from models import Match, Team, Court
from datetime import datetime, timedelta

schedule_blueprint = Blueprint('schedule', __name__, url_prefix='/api/schedule')

def generate_round_robin_matches(tournament_id, category_id=None):
    # Logic extracted for reuse
    # If category_id is None, maybe generate for all categories in tournament?
    # For now, let's assume if category_id is None, we fetch all categories or just fail?
    # The original code required category_id. 
    # Let's support fetching all categories if not provided.
    
    matches_created = []
    
    query = Team.query.filter_by(tournament_id=tournament_id)
    if category_id:
        query = query.filter_by(category_id=category_id)
    
    teams = query.all()
    
    # Group teams by category if we are doing bulk generation
    teams_by_category = {}
    for team in teams:
        cat_id = team.category_id or 0 # 0 for unassigned
        if cat_id not in teams_by_category:
            teams_by_category[cat_id] = []
        teams_by_category[cat_id].append(team)

    start_time = datetime(2025, 2, 10, 9, 0, 0)
    court_id = 1
    
    for cat_id, cat_teams in teams_by_category.items():
        if len(cat_teams) < 2:
            continue
            
        n = len(cat_teams)
        for i in range(n):
            for j in range(i + 1, n):
                match = Match(
                    round=1,
                    group_code="A",
                    scheduled_at=start_time,
                    status="SCHEDULED",
                    tournament_id=tournament_id,
                    category_id=cat_id if cat_id != 0 else None,
                    home_team_id=cat_teams[i].id,
                    away_team_id=cat_teams[j].id,
                    court_id=court_id
                )
                matches_created.append(match)
                start_time += timedelta(hours=1)
                
    if matches_created:
        db.session.add_all(matches_created)
        db.session.commit()
        
    return matches_created

@schedule_blueprint.route('/generate', methods=['POST'])
def generate_schedule():
    data = request.get_json()
    tournament_id = data.get('tournamentId')
    category_id = data.get('categoryId')
    
    if not tournament_id:
        return jsonify({"error": "TournamentId required"}), 400

    try:
        matches = generate_round_robin_matches(tournament_id, category_id)
        return jsonify({
            "message": f"Generated {len(matches)} matches successfully.",
            "match_count": len(matches)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
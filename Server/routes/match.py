# Server/routes/match.py
from flask import Blueprint, jsonify, request
from extensions import db
from models import Match, Team, MatchSet, User
from sqlalchemy.orm import joinedload
from datetime import datetime
from routes.schedule import advance_knockout

match_blueprint = Blueprint('match', __name__, url_prefix='/api/matches')

@match_blueprint.route('/', methods=['GET'])
def get_matches():
    tournament_id = request.args.get('tournamentId')
    category_id = request.args.get('categoryId')
    round_num = request.args.get('round')
    stage = request.args.get('stage')

    query = Match.query

    if tournament_id:
        query = query.filter_by(tournament_id=tournament_id)
    if category_id:
        query = query.filter_by(category_id=category_id)
    if round_num:
        query = query.filter_by(round=int(round_num))
    if stage:
        query = query.filter_by(stage=stage)

    matches = query.options(
        joinedload(Match.home_team),
        joinedload(Match.away_team),
        joinedload(Match.court),
        joinedload(Match.category),
        joinedload(Match.sets),
        joinedload(Match.referee),
        joinedload(Match.winner_team),
    ).order_by(Match.round, Match.scheduled_at).all()

    return jsonify([m.to_dict() for m in matches]), 200


@match_blueprint.route('/<int:match_id>', methods=['GET'])
def get_match(match_id):
    match = Match.query.options(
        joinedload(Match.home_team),
        joinedload(Match.away_team),
        joinedload(Match.court),
        joinedload(Match.category),
        joinedload(Match.sets),
        joinedload(Match.referee),
        joinedload(Match.winner_team),
    ).get(match_id)

    if not match:
        return jsonify({"error": "Match not found"}), 404
    return jsonify(match.to_dict()), 200


@match_blueprint.route('/<int:match_id>/start', methods=['PUT'])
def start_match(match_id):
    try:
        match = Match.query.get(match_id)
        if not match:
            return jsonify({"error": "Match not found"}), 404
        if match.status == 'FINISHED':
            return jsonify({"error": "Match is already finished"}), 400

        match.started_at = datetime.utcnow()
        match.status = 'ONGOING'
        db.session.commit()
        return jsonify(match.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@match_blueprint.route('/<int:match_id>/score', methods=['PUT'])
def update_score(match_id):
    data = request.get_json()

    # Expected JSON format:
    # { "sets": [ {"homeScore": 21, "awayScore": 15}, {"homeScore": 21, "awayScore": 19} ] }
    sets_data = data.get('sets', [])

    try:
        match = Match.query.get(match_id)
        if not match:
            return jsonify({"error": "Match not found"}), 404

        # Remove old set scores and replace
        MatchSet.query.filter_by(match_id=match.id).delete()

        home_games_won = 0
        away_games_won = 0

        for idx, set_data in enumerate(sets_data):
            h_score = int(set_data.get('homeScore', 0))
            a_score = int(set_data.get('awayScore', 0))

            new_set = MatchSet(
                match_id=match.id,
                set_number=idx + 1,
                home_score=h_score,
                away_score=a_score
            )
            db.session.add(new_set)

            def is_badminton_set_won(s1, s2):
                if s1 < 21:
                    return False
                if s1 == 30 and s2 <= 29:
                    return True
                if s1 >= 21 and s1 - s2 >= 2:
                    return True
                return False

            if is_badminton_set_won(h_score, a_score):
                home_games_won += 1
            elif is_badminton_set_won(a_score, h_score):
                away_games_won += 1

        # Update sets-won summary on the Match row
        match.home_score = home_games_won
        match.away_score = away_games_won

        # If someone has won 2 sets (best of 3), auto-finish the match
        if home_games_won >= 2 or away_games_won >= 2:
            match.status = 'FINISHED'
            match.finished_at = datetime.utcnow()
            if home_games_won > away_games_won:
                match.winner_team_id = match.home_team_id
            elif away_games_won > home_games_won:
                match.winner_team_id = match.away_team_id
            else:
                match.winner_team_id = None
        else:
            # Scores saved but match not yet decided
            if match.status == 'SCHEDULED':
                match.status = 'ONGOING'
                match.started_at = match.started_at or datetime.utcnow()

        db.session.commit()

        # If knockout match finished, advance bracket
        if match.stage == 'KNOCKOUT' and match.status == 'FINISHED' and match.winner_team_id:
            advance_knockout(match.tournament_id, match)

        # Reload with relationships to return full response
        db.session.refresh(match)
        return jsonify(match.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@match_blueprint.route('/<int:match_id>/finish', methods=['PUT'])
def finish_match(match_id):
    """Manually finish a match (committee override)."""
    try:
        match = Match.query.get(match_id)
        if not match:
            return jsonify({"error": "Match not found"}), 404

        match.status = 'FINISHED'
        match.finished_at = datetime.utcnow()

        # Determine winner based on current set scores
        if match.home_score > match.away_score:
            match.winner_team_id = match.home_team_id
        elif match.away_score > match.home_score:
            match.winner_team_id = match.away_team_id

        db.session.commit()

        # If knockout match finished, advance bracket
        if match.stage == 'KNOCKOUT' and match.winner_team_id:
            advance_knockout(match.tournament_id, match)

        return jsonify(match.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@match_blueprint.route('/<int:match_id>/referee', methods=['PUT'])
def assign_referee(match_id):
    data = request.get_json()
    referee_id = data.get('refereeId')

    try:
        match = Match.query.get(match_id)
        if not match:
            return jsonify({"error": "Match not found"}), 404

        referee = User.query.get(referee_id)
        if not referee:
            return jsonify({"error": "Referee not found"}), 404

        match.referee_id = referee_id
        db.session.commit()
        db.session.refresh(match)
        return jsonify(match.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@match_blueprint.route('/referees', methods=['GET'])
def get_referees():
    """Get all users with REFEREE role."""
    try:
        referees = User.query.filter_by(role='REFEREE').all()
        return jsonify([{"id": r.id, "name": r.name, "email": r.email} for r in referees]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
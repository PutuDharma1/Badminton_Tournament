# Server/routes/match.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
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
        
        valid_sets = []

        for idx, set_data in enumerate(sets_data):
            # If match already decided, reject extra sets
            if home_games_won >= 2 or away_games_won >= 2:
                db.session.rollback()
                return jsonify({"error": "Match already decided. Cannot add more sets."}), 400

            h_score = int(set_data.get('homeScore', 0))
            a_score = int(set_data.get('awayScore', 0))
            mx, mn = max(h_score, a_score), min(h_score, a_score)

            # Strict validations
            if mx > 30:
                db.session.rollback()
                return jsonify({"error": f"Invalid score {h_score}-{a_score}: Maximum possible score is 30."}), 400
            
            if mx >= 21:
                if mx == 30:
                    if mn < 28:
                        db.session.rollback()
                        return jsonify({"error": f"Invalid score {h_score}-{a_score}: Set should have ended earlier (e.g., must win by 2 or cap at 30-29)."}), 400
                elif mx > 21:
                    if mx - mn != 2:
                        db.session.rollback()
                        return jsonify({"error": f"Invalid score {h_score}-{a_score}: Must win by exactly 2 points past 20."}), 400
                else: # mx == 21
                    if mn >= 20:
                        db.session.rollback()
                        return jsonify({"error": f"Invalid score {h_score}-{a_score}: Must win by exactly 2 points when reaching 20-20 (Deuce)."}), 400

            new_set = MatchSet(
                match_id=match.id,
                set_number=idx + 1,
                home_score=h_score,
                away_score=a_score
            )
            db.session.add(new_set)
            valid_sets.append(new_set)

            # Evaluate set winner
            if mx >= 21:
                # We already validated validity of mx >= 21, so this is a won set
                if h_score > a_score:
                    home_games_won += 1
                else:
                    away_games_won += 1

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


@match_blueprint.route('/<int:match_id>/retire', methods=['PUT'])
def retire_match(match_id):
    """Retire or walkover a team in a match.
    
    Body: { "retireTeamId": int, "reason": "RETIRE" | "WALKOVER" }
    - RETIRE: player injured mid-match, cannot continue
    - WALKOVER: player/team did not show up
    The opposing team automatically wins.
    """
    data = request.get_json()
    retire_team_id = data.get('retireTeamId')
    reason = data.get('reason', 'RETIRE')

    if not retire_team_id:
        return jsonify({"error": "retireTeamId is required"}), 400

    if reason not in ('RETIRE', 'WALKOVER'):
        return jsonify({"error": "reason must be 'RETIRE' or 'WALKOVER'"}), 400

    try:
        match = Match.query.get(match_id)
        if not match:
            return jsonify({"error": "Match not found"}), 404

        if match.status == 'FINISHED':
            return jsonify({"error": "Match is already finished"}), 400

        # Validate that retire_team_id is one of the teams in this match
        if retire_team_id not in (match.home_team_id, match.away_team_id):
            return jsonify({"error": "retireTeamId must be either the home or away team"}), 400

        # Determine winner (the opposing team)
        if retire_team_id == match.home_team_id:
            winner_id = match.away_team_id
        else:
            winner_id = match.home_team_id

        match.retire_team_id = retire_team_id
        match.finish_reason = reason
        match.winner_team_id = winner_id
        match.status = 'FINISHED'
        match.finished_at = datetime.utcnow()

        # If match hadn't started yet (WALKOVER case), set started_at
        if not match.started_at:
            match.started_at = datetime.utcnow()

        db.session.commit()

        # If knockout match, advance bracket
        if match.stage == 'KNOCKOUT' and match.winner_team_id:
            advance_knockout(match.tournament_id, match)

        db.session.refresh(match)
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


@match_blueprint.route('/<int:match_id>/self-assign', methods=['PUT'])
@jwt_required()
def self_assign_match(match_id):
    current_user_id = get_jwt_identity()

    try:
        user = User.query.get(current_user_id)
        if not user or user.role != 'REFEREE':
            return jsonify({"error": "Unauthorized. Only referees can self-assign."}), 403

        match = Match.query.get(match_id)
        if not match:
            return jsonify({"error": "Match not found"}), 404

        if match.referee_id:
            if match.referee_id == current_user_id:
                return jsonify({"message": "Already assigned to this match"}), 200
            return jsonify({"error": "Match already has a referee assigned"}), 409

        # Check if the referee has an currently ONGOING match
        ongoing_match = Match.query.filter(
            Match.referee_id == current_user_id,
            Match.status == 'ONGOING'
        ).first()

        if ongoing_match:
            return jsonify({
                "error": "You cannot pick up matches while you have an ONGOING match to focus on.",
                "activeMatchId": ongoing_match.id
            }), 400

        # Prevent picking a match at the exact same time
        if match.scheduled_at:
            overlapping_match = Match.query.filter(
                Match.referee_id == current_user_id,
                Match.status.in_(['SCHEDULED', 'ONGOING']),
                Match.scheduled_at == match.scheduled_at
            ).first()

            if overlapping_match:
                return jsonify({
                    "error": "You already have a match scheduled at this exact time.",
                    "activeMatchId": overlapping_match.id
                }), 400

        # Assign referee
        match.referee_id = current_user_id
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
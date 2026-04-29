# Server/routes/match.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Match, Team, MatchSet, User, RefereeApplication, Tournament
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta
from routes.schedule import advance_knockout

match_blueprint = Blueprint('match', __name__, url_prefix='/api/matches')

@match_blueprint.route('/', methods=['GET'])
def get_matches():
    tournament_id = request.args.get('tournamentId')
    category_id = request.args.get('categoryId')
    round_num = request.args.get('round')
    stage = request.args.get('stage')

    try:
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
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve matches: {str(e)}"}), 500


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


def _validate_set(h, a, point_system, is_womens_singles):
    """Returns error string or None if the set score is valid."""
    # A final score can never be tied
    if h == a:
        return f"Score {h}-{a}: tied score is not a valid final score."

    mx, mn = max(h, a), min(h, a)

    if point_system == 'RALLY_21':
        # First to 21 wins; deuce at 20-20 (win by 2); cap at 30 (29-29 → next point wins → 30-29)
        if mx > 30:
            return f"Score {h}-{a}: max is 30."
        if mx >= 21:
            if mx == 30 and mn not in (28, 29):
                return f"Score {h}-{a}: at 30, loser must have 28 or 29 (game should have ended earlier or cap applies)."
            if 21 < mx < 30 and mx - mn != 2:
                return f"Score {h}-{a}: must win by exactly 2 past 20-20."
            if mx == 21 and mn >= 20:
                return f"Score {h}-{a}: must win by 2 at deuce (20-20) — e.g. 22-20."
        return None

    if point_system == 'RALLY_15':
        # First to 15 wins; deuce at 14-14 (win by 2); cap at 21 (20-20 → next point wins → 21-20)
        if mx > 21:
            return f"Score {h}-{a}: max is 21."
        if mx >= 15:
            if mx == 21 and mn not in (19, 20):
                return f"Score {h}-{a}: at 21, loser must have 19 or 20 (game should have ended earlier or cap applies)."
            if 15 < mx < 21 and mx - mn != 2:
                return f"Score {h}-{a}: must win by exactly 2 past 14-14."
            if mx == 15 and mn >= 14:
                return f"Score {h}-{a}: must win by 2 at deuce (14-14) — e.g. 16-14."
        return None

    if point_system == 'CLASSIC':
        # Classic (pre-2006): first to 15.
        # Setting at 13-13: caller may extend to 18 (+5). Setting at 14-14: caller may extend to 17 (+3).
        # Valid final scores ONLY: 15-x (x=0..14), 17-x (x=14..16), 18-x (x=13..17)
        if mx not in (15, 17, 18):
            return (f"Score {h}-{a}: invalid. Classic winner scores exactly 15, 17 (setting at 14-14), "
                    f"or 18 (setting at 13-13).")
        if mx == 17 and mn < 14:
            return f"Score {h}-{a}: at 17, loser must have ≥14 — setting is only invoked at 14-14."
        if mx == 18 and mn < 13:
            return f"Score {h}-{a}: at 18, loser must have ≥13 — setting is only invoked at 13-13."
        return None

    return None


def _set_is_won(h, a, point_system, is_womens_singles):
    mx = max(h, a)
    if point_system == 'RALLY_21': return mx >= 21
    if point_system == 'RALLY_15': return mx >= 15
    if point_system == 'CLASSIC':  return mx in (15, 17, 18)
    return False


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

        tournament = Tournament.query.get(match.tournament_id)
        point_system = tournament.point_system if tournament else 'RALLY_21'
        cat = match.category
        is_womens_singles = (
            cat is not None
            and cat.gender == 'FEMALE'
            and cat.category_type == 'SINGLE'
        )

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

            err = _validate_set(h_score, a_score, point_system, is_womens_singles)
            if err:
                db.session.rollback()
                return jsonify({"error": err}), 400

            new_set = MatchSet(
                match_id=match.id,
                set_number=idx + 1,
                home_score=h_score,
                away_score=a_score
            )
            db.session.add(new_set)
            valid_sets.append(new_set)

            if _set_is_won(h_score, a_score, point_system, is_womens_singles):
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
        bracket_warning = None
        if match.stage == 'KNOCKOUT' and match.status == 'FINISHED' and match.winner_team_id:
            try:
                advance_knockout(match.tournament_id, match)
            except Exception as bracket_err:
                bracket_warning = f"Score saved, but bracket advancement failed: {bracket_err}"

        # Reload with relationships to return full response
        db.session.refresh(match)
        result = match.to_dict()
        if bracket_warning:
            result['warning'] = bracket_warning
        return jsonify(result), 200

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
        bracket_warning = None
        if match.stage == 'KNOCKOUT' and match.winner_team_id:
            try:
                advance_knockout(match.tournament_id, match)
            except Exception as bracket_err:
                bracket_warning = f"Match finished, but bracket advancement failed: {bracket_err}"

        result = match.to_dict()
        if bracket_warning:
            result['warning'] = bracket_warning
        return jsonify(result), 200
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
        bracket_warning = None
        if match.stage == 'KNOCKOUT' and match.winner_team_id:
            try:
                advance_knockout(match.tournament_id, match)
            except Exception as bracket_err:
                bracket_warning = f"Result recorded, but bracket advancement failed: {bracket_err}"

        db.session.refresh(match)
        result = match.to_dict()
        if bracket_warning:
            result['warning'] = bracket_warning
        return jsonify(result), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@match_blueprint.route('/<int:match_id>/referee', methods=['PUT'])
def assign_referee(match_id):
    """Committee assigns a referee to a match. Referee must be ACCEPTED for the tournament."""
    data = request.get_json()
    referee_id = data.get('refereeId')

    try:
        match = Match.query.get(match_id)
        if not match:
            return jsonify({"error": "Match not found"}), 404

        referee = User.query.get(referee_id)
        if not referee:
            return jsonify({"error": "Referee not found"}), 404

        if referee.role != 'REFEREE':
            return jsonify({"error": "Target user is not a referee."}), 400

        # Guard: referee must be ACCEPTED for this tournament
        acceptance = RefereeApplication.query.filter_by(
            referee_id=referee_id,
            tournament_id=match.tournament_id,
            status='ACCEPTED'
        ).first()
        if not acceptance:
            return jsonify({
                "error": "This referee has not been accepted for this tournament and cannot be assigned to matches."
            }), 403

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
    current_user_id = int(get_jwt_identity())

    try:
        user = User.query.get(current_user_id)
        if not user or user.role != 'REFEREE':
            return jsonify({"error": "Unauthorized. Only referees can self-assign."}), 403

        match = Match.query.get(match_id)
        if not match:
            return jsonify({"error": "Match not found"}), 404

        # Guard: referee must be ACCEPTED for this tournament
        acceptance = RefereeApplication.query.filter_by(
            referee_id=current_user_id,
            tournament_id=match.tournament_id,
            status='ACCEPTED'
        ).first()
        if not acceptance:
            return jsonify({
                "error": "You are not an accepted referee for this tournament. Apply and get approved first."
            }), 403

        if match.referee_id:
            if match.referee_id == current_user_id:
                return jsonify({"message": "Already assigned to this match"}), 200
            return jsonify({"error": "Match already has a referee assigned"}), 409

        # Check if the referee has a currently ONGOING match
        ongoing_match = Match.query.filter(
            Match.referee_id == current_user_id,
            Match.status == 'ONGOING'
        ).first()

        if ongoing_match:
            return jsonify({
                "error": "You cannot pick up matches while you have an ONGOING match to focus on.",
                "activeMatchId": ongoing_match.id
            }), 400

        # Prevent picking a match that overlaps an already-assigned match window
        if match.scheduled_at:
            tournament = Tournament.query.get(match.tournament_id)
            duration_minutes = tournament.match_duration_minutes if tournament else 40
            duration = timedelta(minutes=duration_minutes)
            new_start = match.scheduled_at
            new_end   = new_start + duration

            assigned_matches = Match.query.filter(
                Match.referee_id == current_user_id,
                Match.status.in_(['SCHEDULED', 'ONGOING']),
                Match.scheduled_at.isnot(None),
                Match.id != match_id
            ).all()

            for existing in assigned_matches:
                exist_start = existing.scheduled_at
                exist_end   = exist_start + duration
                if new_start < exist_end and exist_start < new_end:
                    return jsonify({
                        "error": (
                            f"Time conflict: this match overlaps with match #{existing.id} "
                            f"scheduled at {exist_start.strftime('%Y-%m-%d %H:%M')}."
                        ),
                        "conflictMatchId": existing.id
                    }), 400

        # Assign referee
        match.referee_id = current_user_id
        db.session.commit()
        db.session.refresh(match)
        return jsonify(match.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500



@match_blueprint.route('/sync-bracket', methods=['POST'])
def sync_bracket():
    """
    Retrigger advance_knockout for all finished KNOCKOUT matches in a tournament.
    Safe to call multiple times (idempotent). Used to fix TBD slots that weren't
    filled because a match finished before the immediate-advance logic was deployed.
    """
    data = request.get_json() or {}
    tournament_id = data.get('tournamentId')
    if not tournament_id:
        return jsonify({"error": "tournamentId required"}), 400

    try:
        finished = (
            Match.query
            .filter_by(tournament_id=tournament_id, stage='KNOCKOUT', status='FINISHED')
            .order_by(Match.round, Match.bracket_position)
            .all()
        )
        synced = 0
        for m in finished:
            if m.winner_team_id:
                result = advance_knockout(tournament_id, m)
                if result:
                    synced += 1
        return jsonify({"synced": synced}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@match_blueprint.route('/referees', methods=['GET'])
def get_referees():
    """Get referees. If ?tournamentId=X is passed, only returns referees ACCEPTED for that tournament."""
    try:
        tournament_id = request.args.get('tournamentId', type=int)
        if tournament_id:
            accepted = RefereeApplication.query.filter_by(
                tournament_id=tournament_id,
                status='ACCEPTED'
            ).all()
            referees = [a.referee for a in accepted]
        else:
            referees = User.query.filter_by(role='REFEREE').all()

        return jsonify([{"id": r.id, "name": r.name, "email": r.email} for r in referees]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
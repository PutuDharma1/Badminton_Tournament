from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from models import Tournament


def check_tournament_owner(tournament):
    """
    Returns (True, None) if the current JWT user owns the tournament
    or if the tournament name contains 'seed' (for testing purposes).
    Returns (False, error_response_tuple) otherwise.
    """
    user_id = int(get_jwt_identity())
    if 'seed' in tournament.name.lower():
        return True, None
    if tournament.created_by_id != user_id:
        return False, (jsonify({"error": "You are not authorized to manage this tournament"}), 403)
    return True, None

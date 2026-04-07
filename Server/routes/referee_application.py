from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from extensions import db
from models import RefereeApplication, Tournament, User

referee_app_blueprint = Blueprint(
    'referee_application', __name__, url_prefix='/api/referee-applications'
)


# ─── Referee: submit application ─────────────────────────────────────────────
@referee_app_blueprint.route('/', methods=['POST'])
@jwt_required()
def apply():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    if user.role != 'REFEREE':
        return jsonify({'error': 'Only referees can apply to tournaments.'}), 403

    data = request.get_json() or {}
    tournament_id = data.get('tournamentId')
    message = (data.get('message') or '').strip() or None

    if not tournament_id:
        return jsonify({'error': 'tournamentId is required.'}), 400

    tournament = Tournament.query.get_or_404(tournament_id)
    if tournament.status == 'FINISHED':
        return jsonify({'error': 'Cannot apply to a finished tournament.'}), 400

    existing = RefereeApplication.query.filter_by(
        referee_id=user_id, tournament_id=tournament_id
    ).first()
    if existing:
        return jsonify({
            'error': 'You have already applied to this tournament.',
            'application': existing.to_dict(),
        }), 409

    app_obj = RefereeApplication(
        referee_id=user_id,
        tournament_id=tournament_id,
        message=message,
    )
    db.session.add(app_obj)
    db.session.commit()
    return jsonify(app_obj.to_dict()), 201


# ─── Referee: list own applications ──────────────────────────────────────────
@referee_app_blueprint.route('/my-applications', methods=['GET'])
@jwt_required()
def my_applications():
    user_id = int(get_jwt_identity())
    apps = (
        RefereeApplication.query
        .filter_by(referee_id=user_id)
        .order_by(RefereeApplication.applied_at.desc())
        .all()
    )
    return jsonify([a.to_dict() for a in apps])


# ─── Committee: list applications for a tournament ───────────────────────────
@referee_app_blueprint.route('/tournament/<int:tournament_id>', methods=['GET'])
@jwt_required()
def tournament_applications(tournament_id):
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    if user.role not in ('COMMITTEE', 'ADMIN'):
        return jsonify({'error': 'Unauthorized.'}), 403

    status_filter = request.args.get('status', '').upper() or None
    q = RefereeApplication.query.filter_by(tournament_id=tournament_id)
    if status_filter:
        q = q.filter_by(status=status_filter)
    apps = q.order_by(RefereeApplication.applied_at.desc()).all()
    return jsonify([a.to_dict() for a in apps])


# ─── Committee: accept or reject an application ───────────────────────────────
@referee_app_blueprint.route('/<int:app_id>/review', methods=['PUT'])
@jwt_required()
def review(app_id):
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    if user.role not in ('COMMITTEE', 'ADMIN'):
        return jsonify({'error': 'Unauthorized.'}), 403

    data = request.get_json() or {}
    action = (data.get('action') or '').upper()
    rejection_reason = (data.get('rejectionReason') or '').strip() or None

    if action not in ('ACCEPTED', 'REJECTED'):
        return jsonify({'error': "action must be 'ACCEPTED' or 'REJECTED'."}), 400

    app_obj = RefereeApplication.query.get_or_404(app_id)
    if app_obj.status != 'PENDING':
        return jsonify({'error': f'Application is already {app_obj.status}.'}), 409

    app_obj.status = action
    app_obj.reviewed_at = datetime.utcnow()
    app_obj.reviewed_by_id = user_id
    app_obj.rejection_reason = rejection_reason if action == 'REJECTED' else None
    db.session.commit()
    return jsonify(app_obj.to_dict())


# ─── Committee: directly add a referee (creates pre-accepted record) ──────────
@referee_app_blueprint.route('/tournament/<int:tournament_id>/add', methods=['POST'])
@jwt_required()
def direct_add(tournament_id):
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    if user.role not in ('COMMITTEE', 'ADMIN'):
        return jsonify({'error': 'Unauthorized.'}), 403

    data = request.get_json() or {}
    referee_id = data.get('refereeId')
    if not referee_id:
        return jsonify({'error': 'refereeId is required.'}), 400

    referee = User.query.get_or_404(referee_id)
    if referee.role != 'REFEREE':
        return jsonify({'error': 'Target user is not a referee.'}), 400

    existing = RefereeApplication.query.filter_by(
        referee_id=referee_id, tournament_id=tournament_id
    ).first()

    if existing:
        if existing.status == 'ACCEPTED':
            return jsonify({'error': 'Referee is already added to this tournament.'}), 409
        existing.status = 'ACCEPTED'
        existing.reviewed_at = datetime.utcnow()
        existing.reviewed_by_id = user_id
        existing.rejection_reason = None
        db.session.commit()
        return jsonify(existing.to_dict())

    app_obj = RefereeApplication(
        referee_id=referee_id,
        tournament_id=tournament_id,
        status='ACCEPTED',
        reviewed_at=datetime.utcnow(),
        reviewed_by_id=user_id,
    )
    db.session.add(app_obj)
    db.session.commit()
    return jsonify(app_obj.to_dict()), 201


# ─── Committee: remove an accepted referee from a tournament ─────────────────
@referee_app_blueprint.route('/tournament/<int:tournament_id>/remove/<int:referee_id>', methods=['DELETE'])
@jwt_required()
def remove_referee(tournament_id, referee_id):
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    if user.role not in ('COMMITTEE', 'ADMIN'):
        return jsonify({'error': 'Unauthorized.'}), 403

    app_obj = RefereeApplication.query.filter_by(
        referee_id=referee_id,
        tournament_id=tournament_id,
        status='ACCEPTED',
    ).first()
    if not app_obj:
        return jsonify({'error': 'Referee not found in this tournament.'}), 404

    db.session.delete(app_obj)
    db.session.commit()
    return jsonify({'message': 'Referee removed successfully.'})

from flask import Blueprint, request, jsonify
from extensions import db
from models import Tournament, Category, Match, Participant, Team
from datetime import datetime
from routes.schedule import generate_round_robin_matches, generate_knockout_bracket, advance_knockout

tournament_blueprint = Blueprint('tournament', __name__, url_prefix='/api/tournaments')

@tournament_blueprint.route('/', methods=['GET'], strict_slashes=False)
def get_tournaments():
    try:
        tournaments = Tournament.query.all()
        # Auto-finish tournaments whose end_date has passed
        now = datetime.utcnow()
        for t in tournaments:
            if t.status == 'ONGOING' and t.end_date and t.end_date < now:
                t.status = 'FINISHED'
                t.current_stage = 'FINISHED'
        db.session.commit()

        result = []
        for t in tournaments:
            d = t.to_dict()
            d['participantCount'] = Participant.query.filter_by(tournament_id=t.id).count()
            d['matchCount'] = Match.query.filter_by(tournament_id=t.id).count()
            result.append(d)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@tournament_blueprint.route('/<int:id>', methods=['GET'])
def get_tournament(id):
    try:
        tournament = Tournament.query.get(id)
        if not tournament:
            return jsonify({"error": "Tournament not found"}), 404
        # Auto-finish if end_date has passed
        now = datetime.utcnow()
        if tournament.status == 'ONGOING' and tournament.end_date and tournament.end_date < now:
            tournament.status = 'FINISHED'
            tournament.current_stage = 'FINISHED'
            db.session.commit()
        d = tournament.to_dict()
        d['participantCount'] = Participant.query.filter_by(tournament_id=id).count()
        d['matchCount'] = Match.query.filter_by(tournament_id=id).count()
        return jsonify(d), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@tournament_blueprint.route('/', methods=['POST'], strict_slashes=False)
def create_tournament():
    data = request.get_json()
    
    required_fields = ['name', 'location', 'startDate', 'endDate', 'createdById']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        new_tournament = Tournament(
            name=data['name'],
            location=data['location'],
            start_date=datetime.fromisoformat(data['startDate'].replace('Z', '+00:00')),
            end_date=datetime.fromisoformat(data['endDate'].replace('Z', '+00:00')),
            description=data.get('description', ''),
            created_by_id=data['createdById'],
            # ── Schedule settings ──
            daily_start_time=data.get('dailyStartTime', '09:00'),
            daily_end_time=data.get('dailyEndTime', '18:00'),
            match_duration_minutes=int(data.get('matchDurationMinutes', 40)),
            break_start_time=data.get('breakStartTime') or None,
            break_end_time=data.get('breakEndTime') or None,
            registration_deadline=datetime.fromisoformat(data['registrationDeadline'].replace('Z', '+00:00')) if data.get('registrationDeadline') else None,
        )
        
        db.session.add(new_tournament)
        db.session.commit()
        
        return jsonify(new_tournament.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@tournament_blueprint.route('/<int:id>', methods=['PUT'])
def update_tournament(id):
    data = request.get_json()
    try:
        tournament = Tournament.query.get(id)
        if not tournament:
            return jsonify({"error": "Tournament not found"}), 404

        if 'name' in data:        tournament.name = data['name']
        if 'location' in data:    tournament.location = data['location']
        if 'startDate' in data:   tournament.start_date = datetime.fromisoformat(data['startDate'].replace('Z', '+00:00'))
        if 'endDate' in data:     tournament.end_date   = datetime.fromisoformat(data['endDate'].replace('Z', '+00:00'))
        if 'description' in data: tournament.description = data['description']
        # ── Schedule settings ──
        if 'dailyStartTime' in data:       tournament.daily_start_time       = data['dailyStartTime'] or '09:00'
        if 'dailyEndTime' in data:         tournament.daily_end_time         = data['dailyEndTime']   or '18:00'
        if 'matchDurationMinutes' in data: tournament.match_duration_minutes = int(data['matchDurationMinutes'] or 40)
        if 'breakStartTime' in data:       tournament.break_start_time       = data['breakStartTime'] or None
        if 'breakEndTime' in data:         tournament.break_end_time         = data['breakEndTime']   or None
        if 'registrationDeadline' in data:
            tournament.registration_deadline = datetime.fromisoformat(data['registrationDeadline'].replace('Z', '+00:00')) if data['registrationDeadline'] else None

        db.session.commit()
        return jsonify(tournament.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@tournament_blueprint.route('/<int:id>', methods=['DELETE'])
def delete_tournament(id):
    try:
        from models import Court, Team, TeamParticipant, Category, Match, MatchSet

        tournament = Tournament.query.get(id)
        if not tournament:
            return jsonify({"error": "Tournament not found"}), 404

        # Delete in correct FK dependency order to avoid constraint violations
        # 1. MatchSet rows (child of Match)
        match_ids = [m.id for m in Match.query.filter_by(tournament_id=id).all()]
        if match_ids:
            MatchSet.query.filter(MatchSet.match_id.in_(match_ids)).delete(synchronize_session=False)

        # 2. Matches
        Match.query.filter_by(tournament_id=id).delete(synchronize_session=False)

        # 3. TeamParticipant rows (child of Team and Participant)
        team_ids = [t.id for t in Team.query.filter_by(tournament_id=id).all()]
        if team_ids:
            TeamParticipant.query.filter(TeamParticipant.team_id.in_(team_ids)).delete(synchronize_session=False)

        # 4. Teams
        Team.query.filter_by(tournament_id=id).delete(synchronize_session=False)

        # 5. Courts
        Court.query.filter_by(tournament_id=id).delete(synchronize_session=False)

        # 6. Participants
        Participant.query.filter_by(tournament_id=id).delete(synchronize_session=False)

        # 7. Categories
        Category.query.filter_by(tournament_id=id).delete(synchronize_session=False)

        # 8. Finally the tournament itself
        db.session.delete(tournament)
        db.session.commit()

        return jsonify({"message": "Tournament deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@tournament_blueprint.route('/<int:id>/start', methods=['POST'])
def start_tournament(id):
    try:
        from models import Court, Team, TeamParticipant, Category

        tournament = Tournament.query.get(id)
        if not tournament:
            return jsonify({"error": "Tournament not found"}), 404

        if tournament.status == 'ONGOING':
            return jsonify({"error": "Tournament is already ongoing"}), 400

        if tournament.status == 'FINISHED':
            return jsonify({"error": "Tournament is already finished"}), 400

        # ── Step 1: Ensure there are at least 4 participants ─────────────────
        participant_count = Participant.query.filter_by(tournament_id=id).count()
        if participant_count < 4:
            return jsonify({"error": f"Need at least 4 participants to form groups. Currently have {participant_count}."}), 400

        # ── Step 2: Ensure tournament has at least one Category ───────────────
        # (Match.category_id is NOT NULL — category is required)
        category = Category.query.filter_by(tournament_id=id).first()
        if not category:
            category = Category(
                name="General",
                gender="MIXED",
                level="OPEN",
                min_age=0,
                max_age=99,
                tournament_id=id,
            )
            db.session.add(category)
            db.session.flush()

        # ── Step 3: Assign category to participants/teams that lack one ───────
        Participant.query.filter_by(tournament_id=id, category_id=None).update(
            {"category_id": category.id}, synchronize_session=False
        )
        Team.query.filter_by(tournament_id=id, category_id=None).update(
            {"category_id": category.id}, synchronize_session=False
        )
        db.session.flush()

        # ── Step 4: Backfill Teams for participants that don't have one ───────
        participants_without_team = (
            Participant.query
            .filter_by(tournament_id=id)
            .filter(~Participant.id.in_(
                db.session.query(TeamParticipant.participant_id)
            ))
            .all()
        )
        for p in participants_without_team:
            team = Team(
                name=p.full_name,
                tournament_id=id,
                category_id=p.category_id or category.id,
            )
            db.session.add(team)
            db.session.flush()
            tp = TeamParticipant(team_id=team.id, participant_id=p.id)
            db.session.add(tp)
        db.session.flush()

        # ── Step 5: Auto-create courts if none exist ──────────────────────────
        existing_courts = Court.query.filter_by(tournament_id=id).count()
        if existing_courts == 0:
            default_courts = [
                Court(name=f"Court {i+1}", location_note=tournament.location, tournament_id=id)
                for i in range(4)
            ]
            db.session.add_all(default_courts)
            db.session.flush()

        # ── Step 6: Generate round-robin matches ──────────────────────────────
        matches = generate_round_robin_matches(id)

        if not matches:
            return jsonify({"error": "No matches could be generated. Check that participants were added correctly."}), 400

        # ── Step 7: Set tournament to ONGOING, stage to GROUP ─────────────────
        tournament.status = 'ONGOING'
        tournament.current_stage = 'GROUP'
        db.session.commit()

        # Gather group info
        teams = Team.query.filter_by(tournament_id=id).all()
        group_codes = sorted(set(t.group_code for t in teams if t.group_code))

        return jsonify({
            "message": "Tournament started successfully. Matches generated.",
            "matchCount": len(matches),
            "status": "ONGOING",
            "currentStage": "GROUP",
            "groups": group_codes,
        }), 200

    except ValueError as ve:
        db.session.rollback()
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500



@tournament_blueprint.route('/<int:id>/fix-teams', methods=['POST'])
def fix_teams(id):
    """
    Backfill Team + TeamParticipant rows for participants that don't have a team yet.
    Useful for tournaments created before the auto-team-creation logic was added.
    """
    try:
        from models import Team, TeamParticipant

        participants = Participant.query.filter_by(tournament_id=id).all()
        created = 0

        for p in participants:
            # Check if this participant already has a team via TeamParticipant
            existing_tp = TeamParticipant.query.filter_by(participant_id=p.id).first()
            if existing_tp:
                continue  # Already has a team, skip

            # Create a solo Team for this participant
            team = Team(
                name=p.full_name,
                tournament_id=p.tournament_id,
                category_id=p.category_id,
            )
            db.session.add(team)
            db.session.flush()

            tp = TeamParticipant(team_id=team.id, participant_id=p.id)
            db.session.add(tp)
            created += 1

        db.session.commit()
        return jsonify({
            "message": f"Fixed {created} participant(s) — created {created} missing team(s).",
            "created": created
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500



# ──────────────────────────────────────────────────────────────────────────────
# Shared standings computation (used by leaderboard endpoint AND knockout seeding)
# ──────────────────────────────────────────────────────────────────────────────

def compute_group_standings(tournament_id, group_code=None, category_id=None):
    """
    Compute standings for a tournament, optionally filtered to one group and/or category.
    Returns a sorted list of dicts (same shape as leaderboard response).
    """
    from sqlalchemy.orm import joinedload

    team_q = Team.query.filter_by(tournament_id=tournament_id)
    if category_id is not None:
        team_q = team_q.filter_by(category_id=category_id)
    if group_code:
        team_q = team_q.filter_by(group_code=group_code)
    teams = team_q.all()
    if not teams:
        return []

    standings = {
        t.id: {
            "teamId": t.id, "teamName": t.name,
            "groupCode": t.group_code,
            "MP": 0, "W": 0, "L": 0, "Pts": 0,
            "SW": 0, "SL": 0, "SD": 0,
            "PW": 0, "PL": 0, "PD": 0,
        }
        for t in teams
    }

    match_q = Match.query.filter_by(
        tournament_id=tournament_id, status='FINISHED', stage='GROUP'
    ).options(joinedload(Match.sets))
    if category_id is not None:
        match_q = match_q.filter_by(category_id=category_id)
    if group_code:
        match_q = match_q.filter_by(group_code=group_code)
    finished = match_q.all()

    for m in finished:
        hid, aid = m.home_team_id, m.away_team_id
        if hid not in standings or aid not in standings:
            continue

        h_pts = sum(s.home_score for s in m.sets)
        a_pts = sum(s.away_score for s in m.sets)
        h_sets = m.home_score
        a_sets = m.away_score

        for tid, sw, sl, pw, pl in [
            (hid, h_sets, a_sets, h_pts, a_pts),
            (aid, a_sets, h_sets, a_pts, h_pts),
        ]:
            standings[tid]["MP"] += 1
            standings[tid]["SW"] += sw
            standings[tid]["SL"] += sl
            standings[tid]["PW"] += pw
            standings[tid]["PL"] += pl

        if m.winner_team_id == hid:
            standings[hid]["W"]   += 1
            standings[hid]["Pts"] += 2
            standings[aid]["L"]   += 1
        elif m.winner_team_id == aid:
            standings[aid]["W"]   += 1
            standings[aid]["Pts"] += 2
            standings[hid]["L"]   += 1

    for row in standings.values():
        row["SD"] = row["SW"] - row["SL"]
        row["PD"] = row["PW"] - row["PL"]

    sorted_rows = sorted(
        standings.values(),
        key=lambda r: (r["Pts"], r["SD"], r["PD"], r["SW"]),
        reverse=True,
    )

    for i, row in enumerate(sorted_rows):
        if i == 0:
            row["rank"] = 1
        else:
            prev = sorted_rows[i - 1]
            same_rank = (
                row["Pts"] == prev["Pts"] and row["SD"] == prev["SD"]
                and row["PD"] == prev["PD"] and row["SW"] == prev["SW"]
            )
            row["rank"] = prev["rank"] if same_rank else i + 1

    return sorted_rows


@tournament_blueprint.route('/<int:id>/leaderboard', methods=['GET'])
def get_leaderboard(id):
    """
    Compute round-robin standings, organized by category and then by group.
    Query params: ?group=A&categoryId=1
    Response (if no filters): { categories: [{categoryId, categoryName, groups: [{code, standings: [...]}]}] }
    """
    try:
        tournament = Tournament.query.get(id)
        if not tournament:
            return jsonify({"error": "Tournament not found"}), 404

        group = request.args.get('group')  # optional filter
        category_id_param = request.args.get('categoryId')
        category_id = int(category_id_param) if category_id_param and category_id_param.isdigit() else None

        if group and category_id:
            standings = compute_group_standings(id, group, category_id)
            return jsonify(standings), 200

        # Build full categorized leaderboard
        teams_query = Team.query.filter_by(tournament_id=id)
        if category_id:
            teams_query = teams_query.filter_by(category_id=category_id)
        if group:
            teams_query = teams_query.filter_by(group_code=group)
            
        teams = teams_query.all()
        
        categories_map = {}
        for t in teams:
            cat_id = t.category_id or 0
            if cat_id not in categories_map:
                categories_map[cat_id] = set()
            if t.group_code:
                categories_map[cat_id].add(t.group_code)

        categories_list = []
        for cat_id, group_codes in sorted(categories_map.items()):
            cat = Category.query.get(cat_id) if cat_id else None
            cat_name = cat.name if cat else 'Unassigned'
            
            groups_data = []
            for code in sorted(group_codes):
                standings = compute_group_standings(id, code, cat_id)
                groups_data.append({
                    "code": code,
                    "standings": standings
                })
                
            categories_list.append({
                "categoryId": cat_id,
                "categoryName": cat_name,
                "groups": groups_data
            })

        # Also return flat format for older clients if needed
        flat_result = {}
        if not category_id: 
            # If no category filtered, just return categories response
            return jsonify({"categories": categories_list}), 200
        else:
            # If a specific category is requested but no group, return the groups dictionary 
            # (backward compatibility for when it returned { "A": [...], "B": [...] })
            if categories_list:
                for grp in categories_list[0]['groups']:
                    flat_result[grp['code']] = grp['standings']
            return jsonify(flat_result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ──────────────────────────────────────────────────────────────────────────────
# Groups endpoint
# ──────────────────────────────────────────────────────────────────────────────

@tournament_blueprint.route('/<int:id>/groups', methods=['GET'])
def get_groups(id):
    """
    Return group assignments for the tournament, organized by category.
    Response: { categories: [{categoryId, categoryName, groups: [{code, teams: [...]}]}] }
    """
    try:
        tournament = Tournament.query.get(id)
        if not tournament:
            return jsonify({"error": "Tournament not found"}), 404

        teams = Team.query.filter_by(tournament_id=id).all()

        # Group by category first, then by group_code
        categories_map = {}
        for t in teams:
            cat_id = t.category_id or 0
            if cat_id not in categories_map:
                categories_map[cat_id] = {}
            code = t.group_code or '?'
            categories_map[cat_id].setdefault(code, []).append(t.to_dict())

        # Build response with category info
        categories_list = []
        for cat_id, groups_map in sorted(categories_map.items()):
            cat = Category.query.get(cat_id) if cat_id else None
            cat_name = cat.name if cat else 'Unassigned'
            groups = [
                {"code": code, "teams": teams_list}
                for code, teams_list in sorted(groups_map.items())
            ]
            categories_list.append({
                "categoryId": cat_id,
                "categoryName": cat_name,
                "groups": groups,
            })

        # Also return flat groups for backward compatibility
        all_groups = []
        for cat_data in categories_list:
            all_groups.extend(cat_data['groups'])

        return jsonify({"groups": all_groups, "categories": categories_list}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ──────────────────────────────────────────────────────────────────────────────
# Generate knockout bracket
# ──────────────────────────────────────────────────────────────────────────────

@tournament_blueprint.route('/<int:id>/generate-knockout', methods=['POST'])
def generate_knockout(id):
    """
    Generate single-elimination bracket from top 2 per group.
    All GROUP matches must be FINISHED first.
    """
    try:
        tournament = Tournament.query.get(id)
        if not tournament:
            return jsonify({"error": "Tournament not found"}), 404

        if tournament.current_stage != 'GROUP':
            return jsonify({"error": f"Cannot generate knockout from stage '{tournament.current_stage}'"}), 400

        matches = generate_knockout_bracket(id)

        tournament.current_stage = 'KNOCKOUT'
        db.session.commit()

        return jsonify({
            "message": f"Knockout bracket generated with {len(matches)} match(es).",
            "matchCount": len(matches),
            "currentStage": "KNOCKOUT",
        }), 201

    except ValueError as ve:
        db.session.rollback()
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

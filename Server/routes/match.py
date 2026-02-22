# Server/routes/match.py
from flask import Blueprint, jsonify, request
from extensions import db
from models import Match, Team, MatchSet  # Jangan lupa import MatchSet
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

    # Eager load relationships, tambahkan joinedload untuk sets
    matches = query.options(
        joinedload(Match.home_team),
        joinedload(Match.away_team),
        joinedload(Match.court),
        joinedload(Match.category),
        joinedload(Match.sets) # Memuat relasi detail skor per set
    ).order_by(Match.scheduled_at).all()

    return jsonify([m.to_dict() for m in matches]), 200

@match_blueprint.route('/<int:match_id>/score', methods=['PUT'])
def update_score(match_id):
    data = request.get_json()
    
    # Menerima data sets dari frontend
    # Format JSON yang diharapkan:
    # { "sets": [ {"homeScore": 21, "awayScore": 15}, {"homeScore": 21, "awayScore": 19} ] }
    sets_data = data.get('sets', [])
    
    try:
        match = Match.query.get(match_id)
        if not match:
            return jsonify({"error": "Match not found"}), 404
            
        # Hapus data set lama jika ada (agar bisa menimpa saat wasit mengedit skor)
        MatchSet.query.filter_by(match_id=match.id).delete()
        
        home_games_won = 0
        away_games_won = 0
        
        # Simpan skor per set ke database
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
            
            # Hitung siapa yang menang di set ini
            if h_score > a_score:
                home_games_won += 1
            elif a_score > h_score:
                away_games_won += 1

        # Update jumlah set yang dimenangkan ke tabel Match
        match.home_score = home_games_won
        match.away_score = away_games_won
        match.status = 'FINISHED'
        match.finished_at = db.func.now()

        # Tentukan pemenang (Bulutangkis Best of 3)
        if home_games_won > away_games_won:
            match.winner_team_id = match.home_team_id
        elif away_games_won > home_games_won:
            match.winner_team_id = match.away_team_id
        else:
            match.winner_team_id = None

        db.session.commit()
        return jsonify(match.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
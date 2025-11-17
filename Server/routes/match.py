# Server/routes/match.py
from flask import Blueprint, jsonify, request
from prisma.models import Match

match_blueprint = Blueprint('match', __name__)

@match_blueprint.route('/list/<int:tournament_id>', methods=['GET'])
def get_matches(tournament_id):
    """
    Mengambil semua pertandingan untuk turnamen,
    termasuk data tim dan kategori.
    """
    matches = Match.prisma().find_many(
        where={'tournamentId': tournament_id},
        include={
            'category': True,
            'court': True,
            'homeTeam': True,
            'awayTeam': True,
            'winnerTeam': True,
            'referee': True
        },
        order={'scheduledAt': 'asc'} # Urutkan berdasarkan jadwal
    )
    return jsonify({"data": [m.dict() for m in matches]})

@match_blueprint.route('/score/<int:match_id>', methods=['PUT'])
def update_score(match_id):
    """
    Wasit menginput skor.
    """
    data = request.json
    if not data:
        return jsonify({"error": "Data skor diperlukan"}), 400

    try:
        home_score = int(data.get('homeScore'))
        away_score = int(data.get('awayScore'))

        # Tentukan pemenang
        winner_id = None
        if home_score > away_score:
            # Perlu mengambil match dulu untuk tahu ID homeTeam
            match_info = Match.prisma().find_unique(where={'id': match_id})
            winner_id = match_info.homeTeamId
        elif away_score > home_score:
            match_info = Match.prisma().find_unique(where={'id': match_id})
            winner_id = match_info.awayTeamId
        
        if winner_id is None:
             return jsonify({"error": "Skor tidak boleh seri"}), 400

        # Update pertandingan
        updated_match = Match.prisma().update(
            where={'id': match_id},
            data={
                'homeScore': home_score,
                'awayScore': away_score,
                'status': 'FINISHED',
                'finishedAt': datetime.now(),
                'winnerTeamId': winner_id
            }
        )

        # TODO (Advanced):
        # Jika ini sistem gugur, cari pertandingan berikutnya
        # dan masukkan 'winner_id' ini ke slot home/away.

        return jsonify(updated_match.dict()), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
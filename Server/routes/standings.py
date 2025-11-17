# Server/routes/standings.py
from flask import Blueprint, jsonify
from prisma.models import Team, Match
from collections import defaultdict

standings_blueprint = Blueprint('standings', __name__)

@standings_blueprint.route('/category/<int:category_id>', methods=['GET'])
def get_standings(category_id):
    """
    Menghitung klasemen (standings) untuk kategori round robin.
    Ini adalah implementasi sederhana (hanya menghitung menang/kalah).
    """
    
    # 1. Dapatkan semua tim di kategori ini
    teams = Team.prisma().find_many(
        where={'categoryId': category_id}
    )
    
    # 2. Dapatkan semua pertandingan yang sudah selesai
    finished_matches = Match.prisma().find_many(
        where={
            'categoryId': category_id,
            'status': 'FINISHED'
        },
        include={'winnerTeam': True}
    )

    # 3. Inisialisasi papan skor
    #    defaultdict(lambda: ...) membuat entri baru jika key belum ada
    standings = defaultdict(lambda: {
        'played': 0,
        'won': 0,
        'lost': 0,
        'points_for': 0,
        'points_against': 0,
        'point_diff': 0
    })

    # 4. Hitung skor
    for match in finished_matches:
        # Tambah data untuk tim tuan rumah
        standings[match.homeTeamId]['played'] += 1
        standings[match.homeTeamId]['points_for'] += match.homeScore
        standings[match.homeTeamId]['points_against'] += match.awayScore
        
        # Tambah data untuk tim tamu
        standings[match.awayTeamId]['played'] += 1
        standings[match.awayTeamId]['points_for'] += match.awayScore
        standings[match.awayTeamId]['points_against'] += match.homeScore

        # Tambah kemenangan/kekalahan
        if match.winnerTeamId == match.homeTeamId:
            standings[match.homeTeamId]['won'] += 1
            standings[match.awayTeamId]['lost'] += 1
        else:
            standings[match.homeTeamId]['lost'] += 1
            standings[match.awayTeamId]['won'] += 1

    # 5. Format hasil
    result = []
    team_map = {team.id: team.name for team in teams}
    
    for team_id, stats in standings.items():
        stats['team_id'] = team_id
        stats['team_name'] = team_map.get(team_id, 'Unknown Team')
        stats['point_diff'] = stats['points_for'] - stats['points_against']
        result.append(stats)
        
    # 6. Urutkan klasemen (berdasarkan kemenangan, lalu selisih poin)
    result.sort(key=lambda x: (x['won'], x['point_diff']), reverse=True)

    return jsonify({"data": result})
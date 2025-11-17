# Server/routes/schedule.py
from flask import Blueprint, jsonify, request
from prisma.models import Category, Team, Match

schedule_blueprint = Blueprint('schedule', __name__)

@schedule_blueprint.route('/generate', methods=['POST'])
def generate_schedule():
    """
    Memicu pembuatan jadwal untuk sebuah kategori.
    Ini adalah placeholder, logika penjadwalan (round robin/knockout)
    perlu diimplementasikan secara detail.
    """
    data = request.json
    category_id = data.get('categoryId')
    
    if not category_id:
        return jsonify({"error": "categoryId diperlukan"}), 400

    # 1. Hapus jadwal lama (jika ada)
    Match.prisma().delete_many(where={'categoryId': category_id})

    # 2. Dapatkan semua tim/peserta dalam kategori ini
    #    Untuk contoh ini, kita asumsikan Kategori ini menggunakan 'Team'
    teams = Team.prisma().find_many(where={'categoryId': category_id})
    
    if len(teams) < 2:
        return jsonify({"error": "Butuh minimal 2 tim untuk membuat jadwal"}), 400

    # 3. Terapkan Algoritma Penjadwalan
    #    CONTOH: Logika Round Robin Sederhana
    #    Ini adalah implementasi naif, HANYA UNTUK ILUSTRASI
    
    matches_to_create = []
    round_num = 1
    
    # Buat daftar pasangan unik
    for i in range(len(teams)):
        for j in range(i + 1, len(teams)):
            home_team = teams[i]
            away_team = teams[j]
            
            matches_to_create.append({
                'round': round_num,
                'status': 'SCHEDULED',
                'tournamentId': home_team.tournamentId,
                'categoryId': category_id,
                'homeTeamId': home_team.id,
                'awayTeamId': away_team.id,
            })
            # Di aplikasi nyata, Anda juga harus mengelola courtId dan scheduledAt
            round_num += 1

    # 4. Simpan pertandingan baru ke DB
    if matches_to_create:
        Match.prisma().create_many(data=matches_to_create)

    return jsonify({"message": f"Sukses membuat {len(matches_to_create)} pertandingan"}), 201
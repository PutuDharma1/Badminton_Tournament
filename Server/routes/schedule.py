from flask import Blueprint, jsonify, request
from extensions import db
from models import Match, Team, Court
from datetime import datetime, timedelta

schedule_blueprint = Blueprint('schedule', __name__, url_prefix='/api/schedule')

def generate_round_robin_matches(tournament_id, category_id=None):
    query = Team.query.filter_by(tournament_id=tournament_id)
    if category_id:
        query = query.filter_by(category_id=category_id)
    
    teams = query.all()
    
    # Kelompokkan tim berdasarkan kategori
    teams_by_category = {}
    for team in teams:
        cat_id = team.category_id or 0
        if cat_id not in teams_by_category:
            teams_by_category[cat_id] = []
        teams_by_category[cat_id].append(team)

    matches_created = []
    courts = Court.query.filter_by(tournament_id=tournament_id).order_by(Court.id).all()
    
    if not courts:
        raise ValueError("Tidak ada lapangan (court) yang tersedia. Harap tambahkan lapangan terlebih dahulu.")

    # Pengaturan asumsi waktu (dalam implementasi nyata, ambil dari Tournament.start_date)
    base_start_time = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(days=1)
    MATCH_DURATION = timedelta(minutes=40) # Estimasi 1 pertandingan 40 menit
    MIN_REST_TIME = timedelta(minutes=20)  # Waktu istirahat minimum
    
    for cat_id, cat_teams in teams_by_category.items():
        if len(cat_teams) < 2:
            continue
            
        # 1. Buat semua kemungkinan pasangan (Round Robin)
        pairings = []
        for i in range(len(cat_teams)):
            for j in range(i + 1, len(cat_teams)):
                pairings.append((cat_teams[i], cat_teams[j]))
        
        # 2. Tracker untuk melacak waktu selesai terakhir setiap tim & jadwal kosong tiap lapangan
        team_last_finish = {team.id: base_start_time for team in cat_teams}
        court_available_time = {court.id: base_start_time for court in courts}
        
        round_num = 1
        
        # 3. Penjadwalan mempertimbangkan Keadilan Waktu Istirahat (Rest Time Difference / Delta R)
        while pairings:
            # Cari lapangan yang paling awal kosong
            best_court_id = min(court_available_time, key=court_available_time.get)
            current_time = court_available_time[best_court_id]
            
            best_pairing = None
            best_pairing_idx = -1
            min_delta_r = float('inf')
            
            # Cari pasangan yang KEDUANYA sudah istirahat cukup, dan pilih yang delta R-nya paling kecil
            for idx, (team_a, team_b) in enumerate(pairings):
                time_since_last_a = current_time - team_last_finish[team_a.id]
                time_since_last_b = current_time - team_last_finish[team_b.id]
                
                if time_since_last_a >= MIN_REST_TIME and time_since_last_b >= MIN_REST_TIME:
                    # Implementasi rumus Skripsi Bab 3.6: Delta R = |T_finish_prev(A) - T_finish_prev(B)|
                    delta_r = abs((team_last_finish[team_a.id] - team_last_finish[team_b.id]).total_seconds())
                    
                    if delta_r < min_delta_r:
                        min_delta_r = delta_r
                        best_pairing = (team_a, team_b)
                        best_pairing_idx = idx
            
            # Jika tidak ada pasangan yang siap (semua masih butuh istirahat), percepat waktu di lapangan ini
            if best_pairing is None:
                # Majukan waktu lapangan ke waktu dimana tim pertama selesai istirahat
                next_ready_times = [t + MIN_REST_TIME for t in team_last_finish.values() if t + MIN_REST_TIME > current_time]
                if next_ready_times:
                    court_available_time[best_court_id] = min(next_ready_times)
                else:
                    court_available_time[best_court_id] += timedelta(minutes=10)
                continue

            # Pasangan terbaik ditemukan, buat pertandingan
            team_a, team_b = best_pairing
            pairings.pop(best_pairing_idx)
            
            match = Match(
                round=round_num,
                group_code="A",
                scheduled_at=current_time,
                status="SCHEDULED",
                tournament_id=tournament_id,
                category_id=cat_id if cat_id != 0 else None,
                home_team_id=team_a.id,
                away_team_id=team_b.id,
                court_id=best_court_id
            )
            matches_created.append(match)
            
            # Perbarui tracker waktu
            finish_time = current_time + MATCH_DURATION
            team_last_finish[team_a.id] = finish_time
            team_last_finish[team_b.id] = finish_time
            court_available_time[best_court_id] = finish_time
            round_num += 1
                
    if matches_created:
        db.session.add_all(matches_created)
        db.session.commit()
        
    return matches_created

@schedule_blueprint.route('/generate', methods=['POST'])
def generate_schedule():
    data = request.get_json()
    tournament_id = data.get('tournamentId')
    category_id = data.get('categoryId') # Opsional
    
    if not tournament_id:
        return jsonify({"error": "TournamentId required"}), 400

    try:
        matches = generate_round_robin_matches(tournament_id, category_id)
        return jsonify({
            "message": f"Generated {len(matches)} matches successfully.",
            "match_count": len(matches)
        }), 201

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Terjadi kesalahan pada server saat membuat jadwal."}), 500
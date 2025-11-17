# Server/routes/participant.py
from flask import Blueprint, request, jsonify
from prisma.models import Participant, Category
from datetime import datetime
from dateutil.relativedelta import relativedelta

participant_blueprint = Blueprint('participant', __name__)

@participant_blueprint.route('/register', methods=['POST'])
def register_participant():
    """
    Mendaftarkan peserta baru dan melakukan validasi usia otomatis.
    """
    data = request.json
    if not data:
        return jsonify({"error": "Data tidak ditemukan"}), 400

    try:
        full_name = data.get('fullName')
        birth_date_str = data.get('birthDate') # Format: YYYY-MM-DD
        gender = data.get('gender') # MALE atau FEMALE
        tournament_id = int(data.get('tournamentId', 1)) # Asumsi default turnamen 1

        if not all([full_name, birth_date_str, gender]):
            return jsonify({"error": "Nama, tanggal lahir, dan gender harus diisi"}), 400

        birth_date = datetime.strptime(birth_date_str, '%Y-%m-%d').date()
        
        tournament_start_date = datetime.now().date()
        
        # 1. Validasi Usia
        age = relativedelta(tournament_start_date, birth_date).years

        # 2. Cari Kategori yang Sesuai
        matching_category = Category.prisma().find_first(
            where={
                'tournamentId': tournament_id,
                'gender': gender,
                'minAge': {'lte': age},
                'maxAge': {'gte': age}
            }
        )

        if not matching_category:
            return jsonify({"error": f"Tidak ada kategori yang cocok untuk usia {age} dan gender {gender}"}), 404

        # 3. Buat Peserta
        new_participant = Participant.prisma().create(
            data={
                'fullName': full_name,
                'birthDate': datetime.strptime(birth_date_str, '%Y-%m-%d'),
                'gender': gender,
                'email': data.get('email'),
                'phone': data.get('phone'),
                'tournamentId': tournament_id,
                'categoryId': matching_category.id # Otomatis terhubung ke kategori
            }
        )

        return jsonify(new_participant.dict()), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@participant_blueprint.route('/list/<int:tournament_id>', methods=['GET'])
def get_participants(tournament_id):
    """
    Mengambil daftar peserta untuk satu turnamen, termasuk kategori mereka.
    """
    participants = Participant.prisma().find_many(
        where={'tournamentId': tournament_id},
        include={'category': True}
    )
    return jsonify({"data": [p.dict() for p in participants]})
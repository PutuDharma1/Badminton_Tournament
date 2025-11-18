# Server/routes/participant.py

from flask import Blueprint, jsonify, request
from extensions import db  # <-- UBAH DI SINI: Impor dari 'extensions'
from prisma.models import Participant
from prisma.errors import PrismaError
#from services.age_rules import is_age_eligible 
import random
from faker import Faker

participant_blueprint = Blueprint('participant', __name__, url_prefix='/api/participants')
fake = Faker('id_ID') 

@participant_blueprint.route('/', methods=['GET'])
def get_participants():
    """
    Mengambil semua peserta beserta kategori mereka.
    """
    try:
        participants = db.participant.find_many(include={'category': True})
        return jsonify([p.dict() for p in participants]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@participant_blueprint.route('/', methods=['POST'])
def create_participant():
    """
    Membuat peserta baru.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        # Validasi sederhana
        required_fields = ['name', 'gender', 'dob', 'category_id']
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400
        
        category = db.category.find_unique(where={'id': data['category_id']})
        if not category:
             return jsonify({"error": "Category not found"}), 404

        participant = db.participant.create(
            data={
                'name': data['name'],
                'gender': data['gender'],
                'dob': data['dob'],
                'category_id': data['category_id'],
            }
        )
        return jsonify(participant.dict()), 201
    
    except PrismaError as e:
        return jsonify({"error": f"Prisma error: {e}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@participant_blueprint.route('/<string:participant_id>', methods=['DELETE'])
def delete_participant(participant_id: str):
    """
    Menghapus seorang peserta berdasarkan ID.
    """
    try:
        participant = db.participant.delete(
            where={'id': participant_id}
        )
        if participant:
            return jsonify({"message": f"Participant {participant.name} deleted successfully"}), 200
        else:
            return jsonify({"error": "Participant not found"}), 404
            
    except PrismaError.RecordNotFound:
        return jsonify({"error": "Participant not found"}), 404
    except PrismaError as e:
        if 'Foreign key constraint failed' in str(e):
             return jsonify({"error": "Cannot delete participant, they are already in a match."}), 409
        return jsonify({"error": f"Prisma error: {e}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@participant_blueprint.route('/seed/<int:count>', methods=['POST'])
def seed_participants(count: int):
    """
    Membuat data peserta dummy (seed) sebanyak 'count'.
    """
    if count not in [16, 32, 64]:
        return jsonify({"error": "Seed count must be 16, 32, or 64"}), 400

    try:
        categories = db.category.find_many()
        if not categories:
            return jsonify({"error": "Tidak ada kategori. Silakan buat kategori terlebih dahulu."}), 400
        
        participant_list = []
        for _ in range(count):
            dob = fake.date_of_birth(minimum_age=15, maximum_age=40).isoformat() + "T00:00:00.000Z"
            
            participant_data = {
                'name': fake.name(),
                'gender': random.choice(['MALE', 'FEMALE']),
                'dob': dob,
                'category_id': random.choice(categories).id,
            }
            participant_list.append(participant_data)

        created_count = db.participant.create_many(
            data=participant_list,
            skip_duplicates=True 
        )

        return jsonify({"message": f"Berhasil menambahkan {created_count.count} peserta dummy"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500
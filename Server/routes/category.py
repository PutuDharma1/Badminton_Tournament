from flask import Blueprint, jsonify
from prisma.models import Category

category_blueprint = Blueprint('category', __name__)

@category_blueprint.route('/list/<int:tournament_id>', methods=['GET'])
def get_categories(tournament_id):
    """
    Mengambil daftar kategori untuk satu turnamen, termasuk jumlah peserta.
    """
    categories = Category.prisma().find_many(
        where={'tournamentId': tournament_id},
        include={'participants': True, 'teams': True}
    )
    

    result = []
    for cat in categories:
        cat_dict = cat.dict()
        # Menghitung peserta (bisa jadi tim atau perorangan)

        cat_dict['participant_count'] = len(cat_dict.pop('participants', []))
        cat_dict['team_count'] = len(cat_dict.pop('teams', []))
        result.append(cat_dict)

    return jsonify({"data": result})

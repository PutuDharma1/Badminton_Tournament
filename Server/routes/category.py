from flask import Blueprint, jsonify
from extensions import db
from models import Category

category_blueprint = Blueprint('category', __name__, url_prefix='/api/categories')

@category_blueprint.route('/', methods=['GET'])
def get_categories():
    try:
        categories = Category.query.all()
        return jsonify([c.to_dict() for c in categories]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

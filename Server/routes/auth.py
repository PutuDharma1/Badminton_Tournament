# Server/routes/auth.py
from flask import Blueprint, request, jsonify
from prisma import Prisma

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")
db = Prisma()


@auth_bp.before_app_first_request
def connect_db():
    if not db.is_connected():
        db.connect()


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = db.user.find_unique(where={"email": email})
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    # NOTE: Sekarang masih plain text; kalau mau aman pakai hash (bcrypt)
    if user.password != password:
        return jsonify({"error": "Invalid email or password"}), 401

    return jsonify(
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,  
        }
    )

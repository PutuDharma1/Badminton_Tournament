# Server/routes/auth.py

from flask import Blueprint, request, jsonify
from extensions import db  # Pastikan impor dari extensions

# 1. MEMBUAT blueprint-nya
# Pastikan namanya 'auth_blueprint' agar konsisten dengan app.py
auth_blueprint = Blueprint('auth', __name__, url_prefix='/api/auth')


# 2. MENDEFINISIKAN route-nya
@auth_blueprint.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    # Logika placeholder sederhana untuk login
    # Ganti ini dengan logika verifikasi user Anda yang sebenarnya
    if username == 'admin' and password == 'admin':
        # Di dunia nyata, Anda akan mengembalikan JWT atau session token
        return jsonify({"message": "Login berhasil", "role": "admin"}), 200
    elif username == 'wasit' and password == 'wasit':
        return jsonify({"message": "Login berhasil", "role": "referee"}), 200
    
    return jsonify({"error": "Username atau password salah"}), 401
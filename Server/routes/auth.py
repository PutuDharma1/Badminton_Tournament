from flask import Blueprint, request, jsonify
from extensions import db, bcrypt, jwt
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import User

auth_blueprint = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_blueprint.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'COMMITTEE') # Default role

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400

    try:
        # Check if user exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({"error": "Email already exists"}), 400

        # Hash password
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        # Create user
        new_user = User(
            name=name,
            email=email,
            password=hashed_password,
            role=role
        )
        db.session.add(new_user)
        db.session.commit()
        
        # Create token
        access_token = create_access_token(identity=str(new_user.id))
        
        return jsonify({
            "message": "Registration successful",
            "user": {
                "id": new_user.id,
                "name": new_user.name,
                "email": new_user.email,
                "role": new_user.role
            },
            "token": access_token
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@auth_blueprint.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        user = User.query.filter_by(email=email).first()

        if user and bcrypt.check_password_hash(user.password, password):
            access_token = create_access_token(identity=str(user.id))
            return jsonify({
                "message": "Login successful",
                "user": {
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                    "role": user.role
                },
                "token": access_token
            }), 200
        
        return jsonify({"error": "Invalid email or password"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_blueprint.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    current_user_id = get_jwt_identity()
    try:
        user = User.query.get(int(current_user_id))
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        return jsonify({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_blueprint.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    current_user_id = get_jwt_identity()
    
    # Optional: Check if user is updating their own profile or is admin
    # For now, simplistic check:
    # if current_user_id != str(user_id): ...

    data = request.get_json()
    
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        if 'name' in data:
            user.name = data['name']
        if 'email' in data:
            user.email = data['email']
        if 'role' in data:
            user.role = data['role']
        if 'password' in data:
            user.password = bcrypt.generate_password_hash(data['password']).decode('utf-8')

        db.session.commit()
        
        return jsonify({
            "message": "User updated successfully",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
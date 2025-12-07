from flask import Flask
from sqlalchemy import text
from flask_cors import CORS
from extensions import db, bcrypt, jwt, migrate
import os
from dotenv import load_dotenv

load_dotenv()

# Import models to ensure they are registered with SQLAlchemy
import models 

from routes.participant import participant_blueprint 
from routes.category import category_blueprint
from routes.auth import auth_blueprint
from routes.match import match_blueprint
from routes.schedule import schedule_blueprint
from routes.standings import standings_blueprint
from routes.tournament import tournament_blueprint

app = Flask(__name__)
CORS(app)

# Configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'super-secret-key-change-this')
# Use postgresql:// instead of postgresql+psycopg2:// if preferred, but usually equivalent for this driver
# Ensure we use the correct driver prefix if needed, but 'postgresql://' is standard in recent SQLA
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL').replace('postgresql://', 'postgresql+psycopg2://')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize Extensions
db.init_app(app)
bcrypt.init_app(app)
jwt.init_app(app)
migrate.init_app(app, db)

app.register_blueprint(participant_blueprint)
app.register_blueprint(category_blueprint)
app.register_blueprint(auth_blueprint)
app.register_blueprint(match_blueprint)
app.register_blueprint(schedule_blueprint)
app.register_blueprint(standings_blueprint)
app.register_blueprint(tournament_blueprint)

@app.route('/')
def hello_world():
    return 'Hello, World!'

from sqlalchemy import text

# ... (keep existing lines)

if __name__ == '__main__':
    with app.app_context():
        try:
            db.session.execute(text('SELECT 1'))
            print("\n" + "="*50)
            print(" EXTENSIONS CONNECTED: SQLAlchemy (Database)")
            print("="*50 + "\n")
        except Exception as e:
            print("\n" + "!"*50)
            print(" CONNECTION ERROR: Could not connect to the database")
            print(f" Details: {e}")
            print("!"*50 + "\n")
    
    app.run(debug=True)
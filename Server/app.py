# Server/app.py
from flask import Flask
from flask_cors import CORS
from extensions import db 

# Hubungkan Prisma
db.connect()

from routes.participant import participant_blueprint 
from routes.category import category_blueprint
from routes.auth import auth_blueprint
from routes.match import match_blueprint
from routes.schedule import schedule_blueprint
from routes.standings import standings_blueprint

app = Flask(__name__)
CORS(app)

app.register_blueprint(participant_blueprint)
app.register_blueprint(category_blueprint)
app.register_blueprint(auth_blueprint)
app.register_blueprint(match_blueprint)
app.register_blueprint(schedule_blueprint)
app.register_blueprint(standings_blueprint)

@app.route('/')
def hello_world():
    return 'Hello, World!'

if __name__ == '__main__':
    app.run(debug=True)
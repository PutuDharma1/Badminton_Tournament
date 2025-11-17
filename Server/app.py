# Server/app.py
from flask import Flask
from flask_cors import CORS  # Impor CORS
from prisma import Prisma, register

# Impor semua blueprint Anda
from routes.user import user_blueprint
from routes.participant import participant_blueprint
from routes.category import category_blueprint
from routes.schedule import schedule_blueprint
from routes.match import match_blueprint
from routes.standings import standings_blueprint

db = Prisma()
db.connect()
register(db)

app = Flask(__name__)
# Aktifkan CORS untuk semua domain di semua rute
CORS(app) 

@app.route('/', methods=['GET'])
def index():
  return {"ping": "pong"}

# Daftarkan semua blueprint
app.register_blueprint(user_blueprint, url_prefix='/user')
app.register_blueprint(participant_blueprint, url_prefix='/participant')
app.register_blueprint(category_blueprint, url_prefix='/category')
app.register_blueprint(schedule_blueprint, url_prefix='/schedule')
app.register_blueprint(match_blueprint, url_prefix='/match')
app.register_blueprint(standings_blueprint, url_prefix='/standings')
# 'report_blueprint' bisa ditambahkan nanti

if __name__ == "__main__":
  app.run(debug=True, port=5000, threaded=True)
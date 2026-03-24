from app import app, db
from sqlalchemy import text

with app.app_context():
    db.session.execute(text('ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS retire_team_id INTEGER REFERENCES "Team"(id)'))
    db.session.execute(text('ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS finish_reason VARCHAR(20)'))
    db.session.commit()
    print("Migration done! Added retire_team_id and finish_reason columns.")

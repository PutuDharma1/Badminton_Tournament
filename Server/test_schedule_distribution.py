from app import app
from extensions import db
from models import Tournament, Match, Court

with app.app_context():
    # Get latest tournament
    t = Tournament.query.order_by(Tournament.id.desc()).first()
    if not t:
        print("No tournament found.")
    else:
        with open("schedule_log.txt", "w", encoding="utf-8") as f:
            f.write(f"Tournament {t.id}: {t.name}\n")
            matches = Match.query.filter_by(tournament_id=t.id, stage='GROUP').order_by(Match.scheduled_at).all()
            
            # Print first 50 matches
            for m in matches[:50]:
                court = Court.query.get(m.court_id)
                f.write(f"[{m.scheduled_at.strftime('%H:%M')}] Court: {court.name:<8} | Round {m.round} | Group {m.group_code} | Match {m.id}\n")
                
            f.write(f"Total Group Stage Matches: {len(matches)}\n")

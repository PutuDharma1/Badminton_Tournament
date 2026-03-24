from app import app
from extensions import db
from models import Match, Tournament

def cleanup():
    with app.app_context():
        # Find the dummy tournament
        t = Tournament.query.filter_by(name="Dummy Tournament 5 Categories").first()
        if not t:
            print("Tournament not found. Looking for any tournament with KNOCKOUT matches...")
            # If not found, just delete ALL knockout matches for all tournaments to be safe
            deleted = Match.query.filter_by(stage='KNOCKOUT').delete()
            print(f"Deleted {deleted} KO matches globally.")
        else:
            deleted = Match.query.filter_by(tournament_id=t.id, stage='KNOCKOUT').delete()
            print(f"Deleted {deleted} KO matches from Dummy Tournament (ID: {t.id}).")
            t.current_stage = 'GROUP'
        
        db.session.commit()
        print("Done! You can now click Generate Knockout Bracket again.")

if __name__ == '__main__':
    cleanup()

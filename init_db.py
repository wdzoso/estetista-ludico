from app import app, db

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("Database e tabelle create con successo!")
        print("File database.db creato nella directory corrente.")
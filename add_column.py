from app import app, db

if __name__ == '__main__':
    with app.app_context():
        with db.engine.connect() as conn:
            conn.execute(db.text('ALTER TABLE appointment ADD COLUMN access_code VARCHAR(100)'))

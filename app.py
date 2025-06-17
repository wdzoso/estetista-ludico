from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv
import os
import uuid

load_dotenv()
# --- INIZIALIZZAZIONE ---
app = Flask(__name__)
CORS(app)

# --- CONFIGURAZIONE DATABASE ---
# La logica ora leggerà le variabili da .env (locale) o da Render (produzione)
if os.getenv("USE_SQLITE") == "true":
    # Configurazione per SVILUPPO LOCALE con SQLite
    print("--- INFO: Avvio in modalità SVILUPPO, uso database SQLite locale. ---")
    instance_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance')
    os.makedirs(instance_path, exist_ok=True)
    db_path = os.path.join(instance_path, 'database.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + db_path
else:
    # Configurazione per PRODUZIONE con database esterno (es. PostgreSQL su Render)
    print("--- INFO: Avvio in modalità PRODUZIONE, uso database esterno. ---")
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        raise ValueError("ERRORE: La variabile d'ambiente DATABASE_URL non è impostata in modalità produzione.")
    
    # Correzione necessaria per le nuove versioni di SQLAlchemy con Render/Heroku
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'una-chiave-segreta-di-fallback')


# Inizializza il DB DOPO che la configurazione è stata impostata
db = SQLAlchemy(app)

# --- MODELLI ---
class AvailableSlot(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(10))  # formato: YYYY-MM-DD
    time = db.Column(db.String(5))   # formato: HH:MM

class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    service = db.Column(db.String(100))
    date = db.Column(db.String(10))
    time = db.Column(db.String(5))
    access_code = db.Column(db.String(100), unique=True, nullable=False)

# --- ROUTE PER FILE STATICI ---
@app.route('/')
def index():
    return send_from_directory('public', 'admin.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('public', filename)

# --- API ADMIN ---
@app.route('/api/admin/add-slot', methods=['POST'])
def add_slot():
    data = request.get_json()
    new_slot = AvailableSlot(date=data['date'], time=data['time'])
    db.session.add(new_slot)
    db.session.commit()
    return jsonify({'message': 'Slot disponibile aggiunto'}), 201

@app.route('/api/admin/delete-slot', methods=['DELETE'])
def delete_slot():
    data = request.get_json()
    slot = AvailableSlot.query.filter_by(date=data['date'], time=data['time']).first()
    if slot:
        db.session.delete(slot)
        db.session.commit()
        return jsonify({'message': 'Slot disponibile eliminato'}), 200
    return jsonify({'error': 'Slot non trovato'}), 404

# --- NUOVA API PER ELIMINARE APPUNTAMENTI PRENOTATI ---
@app.route('/api/admin/delete-appointment', methods=['DELETE'])
def delete_appointment():
    data = request.get_json()
    appointment = Appointment.query.filter_by(date=data['date'], time=data['time']).first()
    if appointment:
        db.session.delete(appointment)
        db.session.commit()
        return jsonify({'message': 'Appuntamento eliminato con successo'}), 200
    return jsonify({'error': 'Appuntamento non trovato'}), 404

# --- API ADMIN /api/admin/all-slots MODIFICATA ---
# Ora restituisce anche i dettagli dell'appuntamento se lo slot è prenotato
@app.route('/api/admin/all-slots', methods=['GET'])
def get_all_slots():
    slots = AvailableSlot.query.all()
    appointments = Appointment.query.all()
    # Mappa per una ricerca veloce: {(data, ora): oggetto_appuntamento}
    booked_map = {(app.date, app.time): app for app in appointments}
    
    result = []
    for slot in slots:
        is_booked = (slot.date, slot.time) in booked_map
        appointment_details = None
        if is_booked:
            appointment = booked_map[(slot.date, slot.time)]
            appointment_details = {
                'id': appointment.id,
                'name': appointment.name,
                'service': appointment.service,
                'access_code': appointment.access_code
            }
        
        result.append({
            'id': slot.id,
            'date': slot.date,
            'time': slot.time,
            'booked': is_booked,
            'appointment': appointment_details # Restituisce i dettagli o null
        })
    return jsonify(result)

# --- API UTENTE ---
@app.route('/api/available-slots', methods=['GET'])
def get_available_slots():
    slots = AvailableSlot.query.all()
    booked = Appointment.query.all()
    booked_set = {(b.date, b.time) for b in booked}
    available = [{'date': s.date, 'time': s.time} for s in slots if (s.date, s.time) not in booked_set]
    return jsonify(available)

@app.route('/api/book', methods=['POST'])
def book_appointment():
    data = request.get_json()
    if Appointment.query.filter_by(date=data['date'], time=data['time']).first():
        return jsonify({'error': 'Orario già prenotato'}), 400

    import random, string

    new_app = Appointment(
        name=data['name'],
        service=data['service'],
        date=data['date'],
        time=data['time'],
        access_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6)) # Codice di accesso casuale di 6 caratteri
    )
    db.session.add(new_app)
    db.session.commit()
    return jsonify({'message': 'Appuntamento confermato', 'access_code': new_app.access_code}), 201

@app.route('/api/appointment/search', methods=['POST'])
def search_appointment():
    data = request.get_json()
    access_code = data.get('access_code')
    
    if not access_code:
        return jsonify({'error': 'Codice di accesso richiesto'}), 400
    
    appointment = Appointment.query.filter_by(access_code=access_code).first()
    
    if not appointment:
        return jsonify({'error': 'Prenotazione non trovata'}), 404
    
    return jsonify({
        'id': appointment.id,
        'name': appointment.name,
        'service': appointment.service,
        'date': appointment.date,
        'time': appointment.time
    }), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)

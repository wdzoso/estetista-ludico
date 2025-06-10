from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Configurazione per servire file statici dalla cartella public
@app.route('/')
def index():
    return send_from_directory('public', 'admin.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('public', filename)

# MODELLI
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
    access_code = db.Column(db.String(100), unique=True)

# Le tabelle del database verranno create tramite lo script init_db.py separato

# API ADMIN: aggiungi slot disponibili
@app.route('/api/admin/add-slot', methods=['POST'])
def add_slot():
    data = request.get_json()
    new_slot = AvailableSlot(date=data['date'], time=data['time'])
    db.session.add(new_slot)
    db.session.commit()
    return jsonify({'message': 'Slot disponibile aggiunto'}), 201

# API ADMIN: elimina slot disponibile
@app.route('/api/admin/delete-slot', methods=['DELETE'])
def delete_slot():
    data = request.get_json()
    slot = AvailableSlot.query.filter_by(date=data['date'], time=data['time']).first()
    if slot:
        db.session.delete(slot)
        db.session.commit()
        return jsonify({'message': 'Slot eliminato'}), 200
    return jsonify({'error': 'Slot non trovato'}), 404

# API ADMIN: recupera tutti gli slot (inclusi quelli prenotati)
@app.route('/api/admin/all-slots', methods=['GET'])
def get_all_slots():
    slots = AvailableSlot.query.all()
    booked = Appointment.query.all()
    booked_set = {(b.date, b.time) for b in booked}
    
    result = []
    for slot in slots:
        result.append({
            'id': slot.id,
            'date': slot.date,
            'time': slot.time,
            'booked': (slot.date, slot.time) in booked_set
        })
    return jsonify(result)

# API GET: recupera solo gli slot non ancora prenotati
@app.route('/api/available-slots', methods=['GET'])
def get_available_slots():
    # Prendi tutti gli slot e filtra quelli già prenotati
    slots = AvailableSlot.query.all()
    booked = Appointment.query.all()
    booked_set = {(b.date, b.time) for b in booked}
    available = [
        {'date': s.date, 'time': s.time}
        for s in slots if (s.date, s.time) not in booked_set
    ]
    return jsonify(available)

# API UTENTE: prenota appuntamento
@app.route('/api/book', methods=['POST'])
def book_appointment():
    import uuid
    data = request.get_json()

    # Verifica se già prenotato
    existing = Appointment.query.filter_by(date=data['date'], time=data['time']).first()
    if existing:
        return jsonify({'error': 'Orario già prenotato'}), 400

    # Genera codice univoco
    access_code = str(uuid.uuid4())

    new_app = Appointment(
        name=data['name'],
        service=data['service'],
        date=data['date'],
        time=data['time'],
        access_code=access_code
    )
    db.session.add(new_app)
    db.session.commit()

    return jsonify({
        'message': 'Appuntamento confermato',
        'access_code': access_code
    }), 201


if __name__ == '__main__':
    app.run(debug=True)
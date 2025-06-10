const API_BASE_URL = "http://localhost:5000/api";

// --- DEFINIZIONE DI TUTTE LE FUNZIONI ---

// Genera la griglia degli orari selezionabili
function generateTimeSlots() {
  const timeGrid = document.getElementById('timeGrid');
  if (!timeGrid) return;
  const times = [];
  for (let hour = 10; hour <= 17; hour++) {
    times.push(`${String(hour).padStart(2, '0')}:00`);
    if (hour < 17) times.push(`${String(hour).padStart(2, '0')}:30`);
  }
  times.push('18:00');
  timeGrid.innerHTML = times.map(time => 
    `<div class="time-slot" data-time="${time}" onclick="toggleTimeSlot(this)">${time}</div>`
  ).join('');
}

// Attiva/disattiva la selezione di un orario
function toggleTimeSlot(element) {
  element.classList.toggle('selected');
}

// Pulisce la selezione degli orari e resetta il form
function clearSelection() {
  document.querySelectorAll('.time-slot.selected').forEach(el => el.classList.remove('selected'));
  document.getElementById('slotForm').reset();
}

// Formatta una data in un formato leggibile
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Carica tutti gli slot (disponibili e prenotati) dal server
async function loadSlots() {
  const slotList = document.getElementById('slotList');
  if (!slotList) return;
  slotList.innerHTML = '<p>Caricamento in corso...</p>';
  
  try {
    const response = await fetch(`${API_BASE_URL}/admin/all-slots`);
    const slots = await response.json();
    
    if (slots.length === 0) {
      slotList.innerHTML = '<li>Nessun orario gestito al momento.</li>';
      return;
    }
    
    slotList.innerHTML = slots
      .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))
      .map(slot => {
        let detailsHtml = '';
        let buttonHtml = '';

        if (slot.booked && slot.appointment) {
            detailsHtml = `
                <div class="details-group">
                    <span class="status-badge status-booked">Prenotato da: <strong>${slot.appointment.name}</strong></span>
                    <span class="service-info">(${slot.appointment.service})</span>
                </div>`;
            buttonHtml = `<button class="delete-btn delete-btn-booked" onclick="deleteAppointment('${slot.date}', '${slot.time}')">🗑️ Cancella Prenotazione</button>`;
        } else {
            detailsHtml = `<div class="details-group"><span class="status-badge status-available">Disponibile</span></div>`;
            buttonHtml = `<button class="delete-btn" onclick="deleteSlot('${slot.date}', '${slot.time}')">🗑️ Elimina Slot</button>`;
        }

        return `<li class="slot-item ${slot.booked ? 'booked' : ''}">
                  <div class="slot-info">
                    <span><strong>${formatDate(slot.date)}</strong> alle <strong>${slot.time}</strong></span>
                    ${detailsHtml}
                  </div>
                  ${buttonHtml}
                </li>`;
      }).join('');
  } catch (error) {
    slotList.innerHTML = '<li style="color: red;">Errore nel caricamento degli slot. Controlla la console per dettagli.</li>';
    console.error('Errore in loadSlots:', error);
  }
}

// Elimina uno SLOT DISPONIBILE
async function deleteSlot(date, time) {
  if (!confirm(`Sei sicuro di voler eliminare lo SLOT del ${formatDate(date)} alle ${time}?`)) return;
  try {
    const response = await fetch(`${API_BASE_URL}/admin/delete-slot`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({date, time})
    });
    if (!response.ok) throw new Error('Errore dal server');
    loadSlots();
  } catch (error) {
    alert(`Errore durante l'eliminazione dello slot: ${error.message}`);
  }
}

// Elimina una PRENOTAZIONE ESISTENTE
async function deleteAppointment(date, time) {
  if (!confirm(`Sei sicuro di voler CANCELLARE la PRENOTAZIONE del ${formatDate(date)} alle ${time}?`)) return;
  try {
    const response = await fetch(`${API_BASE_URL}/admin/delete-appointment`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, time })
    });
    if (!response.ok) throw new Error('Errore dal server');
    alert('Prenotazione eliminata con successo.');
    loadSlots();
  } catch (error) {
    alert(`Errore durante la cancellazione della prenotazione: ${error.message}`);
  }
}

// --- ESECUZIONE DEL CODICE E COLLEGAMENTO EVENTI ---

// Quando il documento è pronto, avvia le funzioni iniziali.
document.addEventListener('DOMContentLoaded', function() {
  generateTimeSlots();
  loadSlots();

  const slotForm = document.getElementById('slotForm');
  if (slotForm) {
    slotForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const startDate = document.getElementById('startDate').value;
      const endDate = document.getElementById('endDate').value;
      const repeatType = document.querySelector('input[name="repeat"]:checked').value;
      const selectedTimes = Array.from(document.querySelectorAll('.time-slot.selected')).map(el => el.dataset.time);

      if (!startDate || selectedTimes.length === 0) {
        return alert('Seleziona almeno una data e un orario.');
      }
      
      const dates = [];
      let current = new Date(startDate + 'T00:00:00');
      const end = endDate ? new Date(endDate + 'T00:00:00') : current;
      const increment = repeatType === 'weekly' ? 7 : 14;

      do {
        dates.push(current.toISOString().split('T')[0]);
        if (repeatType !== 'none') current.setDate(current.getDate() + increment);
      } while (repeatType !== 'none' && current <= end);

      const slotsToCreate = dates.flatMap(date => selectedTimes.map(time => ({date, time})));
      
      if (slotsToCreate.length > 50 && !confirm(`Stai per creare ${slotsToCreate.length} slot. Continuare?`)) return;
      
      let successCount = 0;
      for (const slot of slotsToCreate) {
        try {
          const response = await fetch(`${API_BASE_URL}/admin/add-slot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(slot)
          });
          if (response.ok) successCount++;
        } catch (error) { console.error('Errore creazione slot:', error); }
      }
      
      alert(`${successCount} slot creati con successo. ${slotsToCreate.length - successCount} non creati (probabilmente già esistenti).`);
      clearSelection();
      loadSlots();
    });
  }
});

// ESPONI LE FUNZIONI ALLA PAGINA per renderle accessibili da onclick=""
window.toggleTimeSlot = toggleTimeSlot;
window.clearSelection = clearSelection;
window.loadSlots = loadSlots;
window.deleteSlot = deleteSlot;
window.deleteAppointment = deleteAppointment;

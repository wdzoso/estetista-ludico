// Configurazione API - cambia in produzione!
const API_BASE_URL = "http://localhost:5000/api";

// Genera gli slot orari dalle 10:00 alle 18:00 ogni 30 minuti
function generateTimeSlots() {
  const timeGrid = document.getElementById('timeGrid');
  if (!timeGrid) return; // Verifica che l'elemento esista
  
  const times = [];
  
  for (let hour = 10; hour <= 17; hour++) {
    times.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 17) {
      times.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }
  times.push('18:00');
  
  timeGrid.innerHTML = times.map(time => 
    `<div class="time-slot" data-time="${time}" onclick="toggleTimeSlot(this)">${time}</div>`
  ).join('');
}

function toggleTimeSlot(element) {
  element.classList.toggle('selected');
}

function clearSelection() {
  document.querySelectorAll('.time-slot.selected').forEach(el => {
    el.classList.remove('selected');
  });
  document.getElementById('slotForm').reset();
}

function getSelectedTimes() {
  return Array.from(document.querySelectorAll('.time-slot.selected'))
    .map(el => el.dataset.time);
}

function generateDates(startDate, endDate, repeatType) {
  const dates = [];
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(startDate);
  
  if (repeatType === 'none') {
    dates.push(startDate);
    if (endDate && endDate !== startDate) {
      dates.push(endDate);
    }
  } else {
    const increment = repeatType === 'weekly' ? 7 : 14;
    let current = new Date(start);
    
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + increment);
    }
  }
  
  return dates;
}

async function addSlots(slots) {
  const results = [];
  for (const slot of slots) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/add-slot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slot)
      });
      const result = await response.json();
      results.push({success: response.ok, slot, result});
    } catch (error) {
      results.push({success: false, slot, error: error.message});
    }
  }
  return results;
}

async function deleteSlot(date, time) {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/delete-slot`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({date, time})
    });
    if (response.ok) {
      loadSlots();
    } else {
      alert('Errore nell\'eliminazione dello slot');
    }
  } catch (error) {
    alert('Errore di connessione');
  }
}

async function loadSlots() {
  try {
    document.body.classList.add('loading');
    const response = await fetch(`${API_BASE_URL}/admin/all-slots`);
    const slots = await response.json();
    
    const slotList = document.getElementById('slotList');
    if (!slotList) return;
    
    slotList.innerHTML = slots
      .sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time))
      .map(slot => `
        <li class="slot-item ${slot.booked ? 'booked' : ''}">
          <div class="slot-info">
            <span><strong>${formatDate(slot.date)}</strong> alle <strong>${slot.time}</strong></span>
            <span class="status-badge ${slot.booked ? 'status-booked' : 'status-available'}">
              ${slot.booked ? 'Prenotato' : 'Disponibile'}
            </span>
          </div>
          ${!slot.booked ? `<button class="delete-btn" onclick="deleteSlot('${slot.date}', '${slot.time}')">🗑️ Elimina</button>` : ''}
        </li>
      `).join('');
  } catch (error) {
    alert('Errore nel caricamento degli slot');
    console.error('Error loading slots:', error);
  } finally {
    document.body.classList.remove('loading');
  }
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Inizializzazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', function() {
  // Genera gli slot orari
  generateTimeSlots();
  
  // Carica gli slot esistenti
  loadSlots();
  
  // Event listener per il form, se esiste
  const slotForm = document.getElementById('slotForm');
  if (slotForm) {
    slotForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const startDate = document.getElementById('startDate').value;
      const endDate = document.getElementById('endDate').value;
      const repeatType = document.querySelector('input[name="repeat"]:checked').value;
      const selectedTimes = getSelectedTimes();
      
      if (!startDate || selectedTimes.length === 0) {
        alert('Seleziona almeno una data e un orario');
        return;
      }
      
      const dates = generateDates(startDate, endDate, repeatType);
      const slots = [];
      
      dates.forEach(date => {
        selectedTimes.forEach(time => {
          slots.push({date, time});
        });
      });
      
      if (slots.length > 50) {
        if (!confirm(`Stai per creare ${slots.length} slot. Continuare?`)) {
          return;
        }
      }
      
      document.body.classList.add('loading');
      const results = await addSlots(slots);
      document.body.classList.remove('loading');
      
      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;
      
      if (failed === 0) {
        alert(`${successful} slot creati con successo!`);
        clearSelection();
        loadSlots();
      } else {
        alert(`${successful} slot creati, ${failed} errori. Alcuni slot potrebbero già esistere.`);
        loadSlots();
      }
    });
  }
});

// Funzioni globali per i pulsanti
window.toggleTimeSlot = toggleTimeSlot;
window.clearSelection = clearSelection;
window.deleteSlot = deleteSlot;
window.loadSlots = loadSlots;
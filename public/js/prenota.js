// Configurazione API - deve corrispondere al tuo backend
//const API_BASE_URL = "http://localhost:5000/api";

const API_BASE_URL = window.location.hostname.includes("localhost")
  ? "http://localhost:5000/api"
  : "https://https://estetista-ludico.onrender.com/api";

class BookingSystem {
  constructor() {
    this.currentStep = 1;
    this.bookingData = {
      service: '',
      price: '',
      date: '',
      time: '',
      name: '',
      email: '',
      phone: ''
    };
    this.availableSlots = [];
    this.selectedDateSlots = [];
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadAvailableSlots();
  }

  bindEvents() {
    // Service selection
    document.querySelectorAll('.service-card').forEach(card => {
      card.addEventListener('click', () => this.selectService(card));
    });

    // Navigation buttons
    document.getElementById('nextStep1').addEventListener('click', () => this.goToStep(2));
    document.getElementById('prevStep2').addEventListener('click', () => this.goToStep(1));
    document.getElementById('nextStep2').addEventListener('click', () => this.goToStep(3));
    document.getElementById('prevStep3').addEventListener('click', () => this.goToStep(2));
    document.getElementById('nextStep3').addEventListener('click', () => this.goToStep(4));
    document.getElementById('prevStep4').addEventListener('click', () => this.goToStep(3));
    document.getElementById('confirmBooking').addEventListener('click', () => this.confirmBooking());

    // Customer name input validation
    document.getElementById('customerName').addEventListener('input', (e) => {
      const isValid = e.target.value.trim().length >= 2;
      document.getElementById('nextStep3').disabled = !isValid;
    });
  }

  async loadAvailableSlots() {
    try {
      document.getElementById('loadingCalendar').style.display = 'block';
      
      const response = await fetch(`${API_BASE_URL}/available-slots`);
      if (!response.ok) throw new Error('Errore nel caricamento degli slot');
      
      this.availableSlots = await response.json();
      this.generateCalendar();
      
    } catch (error) {
      console.error('Errore caricamento slot:', error);
      this.showAlert('Errore nel caricamento delle date disponibili. Riprova più tardi.', 'error');
    } finally {
      document.getElementById('loadingCalendar').style.display = 'none';
    }
  }

  generateCalendar() {
    const calendarContainer = document.getElementById('calendarContainer');
    const today = new Date();
    // Imposta l'ora a 0 per confrontare solo le date
    today.setHours(0, 0, 0, 0); 

    // Raggruppa gli slot per data
    const slotsByDate = {};
    this.availableSlots.forEach(slot => {
      const slotDate = new Date(slot.date + 'T00:00:00');
      if (slotDate >= today) { // Considera solo le date da oggi in poi
        if (!slotsByDate[slot.date]) {
          slotsByDate[slot.date] = [];
        }
        slotsByDate[slot.date].push(slot.time);
      }
    });

    // Genera le date disponibili in ordine
    const availableDates = Object.keys(slotsByDate).sort();

    if (availableDates.length === 0) {
      calendarContainer.innerHTML = `
        <div class="alert alert-error" style="grid-column: 1 / -1;">
          Nessuna data disponibile al momento. Riprova più tardi o contattaci direttamente.
        </div>
      `;
      return;
    }

    calendarContainer.innerHTML = availableDates.map(date => {
      const dateObj = new Date(date + 'T00:00:00');
      const dayName = dateObj.toLocaleDateString('it-IT', { weekday: 'short' });
      const dayNumber = dateObj.getDate();
      const monthName = dateObj.toLocaleDateString('it-IT', { month: 'short' });
      const slotsCount = slotsByDate[date].length;

      return `
        <div class="date-card" data-date="${date}">
          <div class="date-day">${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayNumber}</div>
          <div class="date-info">
            <div>${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</div>
            <div style="color: var(--rosa); font-weight: 600; margin-top: 0.5rem; font-size: 0.8em;">
              ${slotsCount} orari liberi
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Bind click events for date cards
    document.querySelectorAll('.date-card').forEach(card => {
      card.addEventListener('click', () => this.selectDate(card));
    });
  }

  selectService(card) {
    document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    this.bookingData.service = card.dataset.service;
    this.bookingData.price = card.dataset.price;
    document.getElementById('nextStep1').disabled = false;
  }

  selectDate(card) {
    document.querySelectorAll('.date-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    const selectedDate = card.dataset.date;
    this.bookingData.date = selectedDate;
    
    this.selectedDateSlots = this.availableSlots
      .filter(slot => slot.date === selectedDate)
      .map(slot => slot.time)
      .sort();
      
    this.generateTimeSlots();
    this.bookingData.time = ''; // Resetta l'orario quando si cambia data
    this.checkStep2Completion();
  }

  generateTimeSlots() {
    const timeSlotsContainer = document.getElementById('timeSlots');
    if (this.selectedDateSlots.length === 0) {
      timeSlotsContainer.innerHTML = '<p>Nessun orario disponibile per questa data.</p>';
      return;
    }

    timeSlotsContainer.innerHTML = this.selectedDateSlots.map(time => `
      <div class="time-slot" data-time="${time}">${time}</div>
    `).join('');

    document.querySelectorAll('.time-slot').forEach(slot => {
      slot.addEventListener('click', () => this.selectTime(slot));
    });
  }

  selectTime(slot) {
    document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
    slot.classList.add('selected');
    this.bookingData.time = slot.dataset.time;
    this.checkStep2Completion();
  }

  checkStep2Completion() {
    const isComplete = this.bookingData.date && this.bookingData.time;
    document.getElementById('nextStep2').disabled = !isComplete;
  }

  goToStep(stepNumber) {
    document.querySelectorAll('.form-section').forEach(section => {
      section.classList.add('hidden');
    });
    
    document.querySelectorAll('.step').forEach((step, index) => {
      step.classList.remove('active', 'completed');
      if (index + 1 < stepNumber) {
        step.classList.add('completed');
      } else if (index + 1 === stepNumber) {
        step.classList.add('active');
      }
    });
    
    document.getElementById(`step${stepNumber}`).classList.remove('hidden');
    this.currentStep = stepNumber;
    
    if (stepNumber === 4) {
      this.updateSummary();
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateSummary() {
    const dateObj = new Date(this.bookingData.date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    document.getElementById('summaryService').textContent = this.bookingData.service;
    document.getElementById('summaryDate').textContent = formattedDate;
    document.getElementById('summaryTime').textContent = this.bookingData.time;
    document.getElementById('summaryName').textContent = document.getElementById('customerName').value.trim();
    document.getElementById('summaryPrice').textContent = `€${this.bookingData.price}`;
    
    this.bookingData.name = document.getElementById('customerName').value.trim();
    this.bookingData.email = document.getElementById('customerEmail').value.trim();
    this.bookingData.phone = document.getElementById('customerPhone').value.trim();
  }

  async confirmBooking() {
    const confirmButton = document.getElementById('confirmBooking');
    confirmButton.disabled = true;
    confirmButton.textContent = 'Invio in corso...';

    try {
      const response = await fetch(`${API_BASE_URL}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.bookingData.name,
          service: this.bookingData.service,
          date: this.bookingData.date,
          time: this.bookingData.time
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Si è verificato un errore');
      }

      // Se la prenotazione va a buon fine, mostra la schermata di successo
      this.goToStep(5);

      const responseData = await response.json();
      if (responseData.access_code) {
        document.getElementById('access_code').textContent = responseData.access_code;
      }
    } catch (error) {
      this.showAlert(`Errore di prenotazione: ${error.message}. Questo orario potrebbe essere stato appena prenotato.`, 'error');
      // Riporta l'utente al passo 2 per scegliere un altro orario
      this.goToStep(2);
      // Ricarica gli slot per avere la lista aggiornata
      this.loadAvailableSlots();
    } finally {
      confirmButton.disabled = false;
      confirmButton.innerHTML = '🎉 Conferma Prenotazione';
    }
  }
  
  showAlert(message, type = 'success') {
    const alertContainer = document.getElementById('alertContainer');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    // Pulisce vecchi alert prima di mostrarne uno nuovo
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertDiv);
    
    // Rimuove l'alert dopo 5 secondi
    setTimeout(() => {
      alertDiv.style.opacity = '0';
      setTimeout(() => alertDiv.remove(), 500);
    }, 5000);
  }
}

// Inizializza il sistema quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
  new BookingSystem();
});

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = "http://localhost:5000/api";
    const form = document.getElementById('searchForm');
    const resultContainer = document.getElementById('resultContainer');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        resultContainer.innerHTML = '<p>Ricerca in corso...</p>';

        const code = document.getElementById('uniqueCode').value;

        if (!code) {
            showAlert('Per favore, inserisci un codice di prenotazione valido.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/appointment/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_code: code })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Dati non validi o prenotazione non trovata.');
            }

            displayAppointment(data);

        } catch (error) {
            showAlert(error.message);
        }
    });

    function displayAppointment(data) {
        const dateObj = new Date(data.date + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString('it-IT', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        resultContainer.innerHTML = `
            <div class="summary-card">
                <h3 style="text-align: center; color: var(--testo); margin-bottom: 1.5rem;">Dettagli Appuntamento</h3>
                <div class="summary-item">
                    <span><strong>Nome:</strong></span>
                    <span>${data.name}</span>
                </div>
                <div class="summary-item">
                    <span><strong>Servizio:</strong></span>
                    <span>${data.service}</span>
                </div>
                <div class="summary-item">
                    <span><strong>Data:</strong></span>
                    <span>${formattedDate}</span>
                </div>
                <div class="summary-item">
                    <span><strong>Ora:</strong></span>
                    <span>${data.time}</span>
                </div>
            </div>
        `;
    }

    function showAlert(message) {
        resultContainer.innerHTML = `<div class="alert alert-error">${message}</div>`;
    }
});

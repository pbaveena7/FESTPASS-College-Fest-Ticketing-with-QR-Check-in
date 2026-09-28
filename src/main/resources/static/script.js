// --- UI Interactivity ---
function showTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    // Deactivate all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Show active tab
    document.getElementById(tabId).classList.add('active');
    // Highlight nav
    const navBtn = document.getElementById('nav-' + tabId);
    if(navBtn) navBtn.classList.add('active');

    // Update Topbar Title
    const titles = {
        'dashboard': 'Dashboard',
        'events': 'Manage Events',
        'attendees': 'Manage Attendees',
        'tickets': 'Digital Tickets',
        'checkin': 'QR Check-in Portal'
    };
    document.getElementById('page-title').innerText = titles[tabId];

    // Load data
    if (tabId === 'dashboard') loadDashboard();
    else if (tabId === 'events') loadEvents();
    else if (tabId === 'attendees') loadAttendees();
    else if (tabId === 'tickets') loadTickets();
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('festpass-theme', isDark ? 'dark' : 'light');
}

// Set current date
document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });

// Init Theme
if(localStorage.getItem('festpass-theme') === 'dark') {
    document.body.classList.add('dark-theme');
}

// --- API Wrapper ---
async function apiCall(url, method = 'GET', body = null) {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) {
        options.body = JSON.stringify(body);
        console.log(`Sending data to ${url}:`, body);
    }
    
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            let errMsg = `HTTP error! status: ${response.status}`;
            try {
                const errData = await response.json();
                errMsg = errData.message || errMsg;
            } catch(e) {}
            throw new Error(errMsg);
        }
        if (response.status !== 204) {
            return await response.json();
        }
    } catch (error) {
        console.error("API Error:", error);
        showToast(error.message, 'error');
        throw error;
    }
}

// --- EVENTS ---
async function loadEvents() {
    const events = await apiCall('/api/festpass/events');
    const tbody = document.querySelector('#events-table tbody');
    tbody.innerHTML = '';
    
    if(events.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No events found. Create one above!</td></tr>`;
        return;
    }
    
    events.forEach(e => {
        tbody.innerHTML += `<tr>
            <td><strong>#${e.id}</strong></td>
            <td>${e.name}</td>
            <td><i class="fa-regular fa-calendar" style="color:var(--text-muted); margin-right:5px;"></i> ${e.date}</td>
            <td><i class="fa-solid fa-location-dot" style="color:var(--text-muted); margin-right:5px;"></i> ${e.venue}</td>
            <td>${e.capacity}</td>
            <td>$${e.ticketPrice.toFixed(2)}</td>
            <td>
                <button class="action-btn btn-edit" title="Edit" onclick="editEvent(${e.id}, '${e.name}', '${e.date}', '${e.venue}', ${e.capacity}, ${e.ticketPrice})"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn btn-delete" title="Delete" onclick="deleteEvent(${e.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    });
}

document.getElementById('event-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('event-id').value;
    const data = {
        name: document.getElementById('event-name').value,
        date: document.getElementById('event-date').value,
        venue: document.getElementById('event-venue').value,
        capacity: parseInt(document.getElementById('event-capacity').value),
        ticketPrice: parseFloat(document.getElementById('event-price').value)
    };

    if (id) {
        await apiCall(`/api/festpass/events/${id}`, 'PUT', data);
        showToast('Event updated successfully');
    } else {
        await apiCall('/api/festpass/events', 'POST', data);
        showToast('Event created successfully');
    }
    clearEventForm();
    loadEvents();
});

function editEvent(id, name, date, venue, capacity, price) {
    document.getElementById('event-id').value = id;
    document.getElementById('event-name').value = name;
    document.getElementById('event-date').value = date;
    document.getElementById('event-venue').value = venue;
    document.getElementById('event-capacity').value = capacity;
    document.getElementById('event-price').value = price;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearEventForm() {
    document.getElementById('event-form').reset();
    document.getElementById('event-id').value = '';
}

async function deleteEvent(id) {
    if(confirm('Are you sure you want to delete this event? This cannot be undone.')) {
        await apiCall(`/api/festpass/events/${id}`, 'DELETE');
        showToast('Event deleted successfully');
        loadEvents();
    }
}

// --- ATTENDEES ---
async function loadAttendees() {
    const attendees = await apiCall('/api/festpass/attendees');
    const tbody = document.querySelector('#attendees-table tbody');
    tbody.innerHTML = '';
    
    if(attendees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No attendees found. Register one above!</td></tr>`;
        return;
    }
    
    attendees.forEach(a => {
        // Generate initials
        const initials = a.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
        
        tbody.innerHTML += `<tr>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:35px; height:35px; border-radius:50%; background:var(--primary); color:white; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:bold;">${initials}</div>
                    <div>
                        <div style="font-weight:600;">${a.name}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">ID: #${a.id}</div>
                    </div>
                </div>
            </td>
            <td><i class="fa-regular fa-envelope" style="color:var(--text-muted); margin-right:5px;"></i> ${a.email}</td>
            <td><i class="fa-solid fa-phone" style="color:var(--text-muted); margin-right:5px;"></i> ${a.phone}</td>
            <td>
                <button class="action-btn btn-edit" title="Edit" onclick="editAttendee(${a.id}, '${a.name}', '${a.email}', '${a.phone}')"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn btn-delete" title="Delete" onclick="deleteAttendee(${a.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    });
}

document.getElementById('attendee-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('attendee-id').value;
    const data = {
        name: document.getElementById('attendee-name').value,
        email: document.getElementById('attendee-email').value,
        phone: document.getElementById('attendee-phone').value
    };

    if (id) {
        await apiCall(`/api/festpass/attendees/${id}`, 'PUT', data);
        showToast('Attendee updated successfully');
    } else {
        await apiCall('/api/festpass/attendees', 'POST', data);
        showToast('Attendee registered successfully');
    }
    clearAttendeeForm();
    loadAttendees();
});

function editAttendee(id, name, email, phone) {
    document.getElementById('attendee-id').value = id;
    document.getElementById('attendee-name').value = name;
    document.getElementById('attendee-email').value = email;
    document.getElementById('attendee-phone').value = phone;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearAttendeeForm() {
    document.getElementById('attendee-form').reset();
    document.getElementById('attendee-id').value = '';
}

async function deleteAttendee(id) {
    if(confirm('Are you sure you want to delete this attendee?')) {
        await apiCall(`/api/festpass/attendees/${id}`, 'DELETE');
        showToast('Attendee deleted successfully');
        loadAttendees();
    }
}

// --- TICKETS ---
async function loadTickets() {
    const tickets = await apiCall('/api/festpass/tickets');
    const tbody = document.querySelector('#tickets-table tbody');
    tbody.innerHTML = '';
    
    if(tickets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No tickets issued yet.</td></tr>`;
        return;
    }
    
    tickets.forEach(t => {
        const statusClass = t.status === 'VALID' ? 'badge-valid' : 'badge-used';
        
        tbody.innerHTML += `<tr>
            <td colspan="5" style="padding: 0; border: none;">
                <div class="digital-ticket">
                    <div class="ticket-qr-section">
                        <i class="fa-solid fa-qrcode" style="font-size: 2.5rem; color:var(--text-main);"></i>
                        <span class="ticket-qr-text">${t.qrCode}</span>
                    </div>
                    <div class="ticket-details">
                        <h4>${t.event.name}</h4>
                        <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:10px;"><i class="fa-solid fa-user"></i> ${t.attendee.name}</div>
                        <span class="status-badge ${statusClass}">${t.status}</span>
                        <div class="ticket-meta">
                            <div><strong>Ticket ID:</strong> #${t.id}</div>
                            <div><strong>Issued:</strong> ${t.issuedDate}</div>
                        </div>
                    </div>
                </div>
            </td>
        </tr>`;
    });
}

document.getElementById('ticket-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        eventId: parseInt(document.getElementById('ticket-event-id').value),
        attendeeId: parseInt(document.getElementById('ticket-attendee-id').value)
    };
    try {
        await apiCall('/api/festpass/tickets', 'POST', data);
        showToast('Ticket generated successfully!');
        document.getElementById('ticket-form').reset();
        loadTickets();
    } catch(err) {
        // Error already handled in apiCall wrapper
    }
});

// --- CHECKIN ---
document.getElementById('checkin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const qrCode = document.getElementById('checkin-qr').value;
    const resDiv = document.getElementById('checkin-result');
    
    try {
        const res = await apiCall('/api/festpass/tickets/check-in', 'POST', { qrCode });
        
        // Success presentation
        resDiv.className = 'checkin-result-panel show';
        resDiv.innerHTML = `
            <div class="result-card result-success">
                <i class="fa-solid fa-check-circle"></i>
                <h3>ENTRY ALLOWED</h3>
                <p>${res.message}</p>
                <div style="margin-top:15px; font-weight:bold;">Ticket #${res.ticketId}</div>
            </div>
        `;
        showToast('Check-in successful!');
    } catch(err) {
        // Error presentation
        resDiv.className = 'checkin-result-panel show';
        
        let errClass = 'result-error';
        let errIcon = 'fa-times-circle';
        let errTitle = 'ENTRY DENIED';
        
        if (err.message.includes('already been used')) {
            errClass = 'result-warning';
            errIcon = 'fa-exclamation-triangle';
            errTitle = 'ALREADY USED';
        }
        
        resDiv.innerHTML = `
            <div class="result-card ${errClass}">
                <i class="fa-solid ${errIcon}"></i>
                <h3>${errTitle}</h3>
                <p>${err.message}</p>
            </div>
        `;
    }
    
    // Clear input and focus back
    const input = document.getElementById('checkin-qr');
    input.value = '';
    input.focus();
});

// --- DASHBOARD ---
async function loadDashboard() {
    const events = await apiCall('/api/festpass/events');
    const tickets = await apiCall('/api/festpass/tickets');
    
    document.getElementById('total-events').innerText = events.length;
    document.getElementById('total-tickets').innerText = tickets.length;
    
    const checkedIn = tickets.filter(t => t.status === 'USED').length;
    document.getElementById('total-checked-in').innerText = checkedIn;
    
    let totalCap = events.reduce((acc, ev) => acc + ev.capacity, 0);
    document.getElementById('total-available').innerText = totalCap - checkedIn;

    const attList = document.getElementById('attendance-list');
    attList.innerHTML = '';
    
    if(events.length === 0) {
        attList.innerHTML = `<p class="text-muted" style="text-align:center;">No events created yet.</p>`;
        return;
    }
    
    for (const ev of events) {
        const att = await apiCall(`/api/festpass/events/${ev.id}/attendance`);
        
        let percentage = 0;
        if (att.capacity > 0) {
            percentage = Math.round((att.checkedIn / att.capacity) * 100);
        }
        
        attList.innerHTML += `
            <div class="attendance-item">
                <div class="att-header">
                    <span class="att-title">${att.eventName}</span>
                    <span class="att-stats">${percentage}% Full</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="att-details">
                    <span>Capacity: <strong>${att.capacity}</strong></span>
                    <span>Tickets Issued: <strong>${att.ticketsIssued}</strong></span>
                    <span>Checked In: <strong>${att.checkedIn}</strong></span>
                    <span>Remaining: <strong>${att.remainingCapacity}</strong></span>
                </div>
            </div>
        `;
    }
}

// Init
window.onload = () => showTab('dashboard');

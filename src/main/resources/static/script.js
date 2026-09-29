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
    const options = { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } };
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
        const csrfCookie = document.cookie.split('; ').find(cookie => cookie.startsWith('XSRF-TOKEN='));
        if (csrfCookie) options.headers['X-XSRF-TOKEN'] = decodeURIComponent(csrfCookie.slice('XSRF-TOKEN='.length));
    }
    if (body) {
        options.body = JSON.stringify(body);
        if (!url.startsWith('/api/auth/')) console.log(`Sending data to ${url}:`, body);
    }
    
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            let errMsg = `HTTP error! status: ${response.status}`;
            try {
                const errData = await response.json();
                errMsg = errData.message || errMsg;
            } catch(e) {}
            const error = new Error(errMsg);
            error.status = response.status;
            throw error;
        }
        if (response.status !== 204) {
            return await response.json();
        }
    } catch (error) {
        const expectedAuthFailure = error.status === 401 && url.startsWith('/api/auth/');
        if (!expectedAuthFailure) console.error("API Error:", error);
        if (error.status === 401 && !url.startsWith('/api/auth/')) {
            showAuthScreen('Your session has expired. Log in again.');
        } else if (!url.startsWith('/api/auth/')) {
            showToast(error.message, 'error');
        }
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

// --- Portal experiences ---
const festPassState = {
    events: [],
    attendees: [],
    tickets: [],
    attendance: [],
    availability: {},
    account: null,
    currentAttendee: null,
    currentEventId: null
};

const attendeePageTitles = {
    home: 'Home',
    events: 'Events',
    registrations: 'My registrations',
    tickets: 'My tickets',
    status: 'Check-in status',
    profile: 'My profile'
};

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

function formatEventDate(value) {
    if (!value) return 'Date to be announced';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? escapeHtml(value) : date.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
}

function formatMoney(value) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function statusBadge(status) {
    const used = status === 'USED';
    return `<span class="status-badge ${used ? 'badge-used' : 'badge-valid'}">${used ? 'USED' : 'VALID'}</span>`;
}

function showLoading(container, message = 'Loading...') {
    if (!container) return;
    const loading = `<div class="loading-state"><span class="loading-spinner"></span>${escapeHtml(message)}</div>`;
    if (container.tagName === 'TBODY') {
        const columns = { 'events-table': 9, 'attendees-table': 8, 'tickets-table': 6, 'registrations-table': 6 };
        container.innerHTML = `<tr><td colspan="${columns[container.closest('table')?.id] || 6}">${loading}</td></tr>`;
        return;
    }
    container.innerHTML = loading;
}

function setPortal(portal) {
    if (portal === 'organizer' && festPassState.account?.role !== 'ORGANIZER') {
        showAuthScreen('Log in with an organizer account to continue.');
        return;
    }
    if (portal === 'attendee' && festPassState.account?.role !== 'ATTENDEE') {
        showAuthScreen('Log in with an attendee account to continue.');
        return;
    }
    document.getElementById('auth-screen').classList.add('is-hidden');
    document.getElementById('portal-selection').classList.add('is-hidden');
    document.getElementById('organizer-portal').classList.toggle('is-hidden', portal !== 'organizer');
    document.getElementById('attendee-portal').classList.toggle('is-hidden', portal !== 'attendee');
    document.body.dataset.portal = portal;
}

function enterPortal(portal) {
    if (portal !== festPassState.account?.role?.toLowerCase()) {
        showAuthScreen('Your account does not have access to that portal.');
        return;
    }
    setPortal(portal);
    updateAccountUi();
    if (portal === 'organizer') showTab('dashboard');
    else showAttendeeTab('home');
}

function switchPortal() {
    logout();
}

function toggleOrganizerMenu() {
    document.querySelector('#organizer-portal .sidebar').classList.toggle('mobile-open');
}

function showTab(tabId) {
    const organizer = document.getElementById('organizer-portal');
    organizer.querySelectorAll('.tab-content').forEach(tab => tab.classList.toggle('active', tab.id === tabId));
    organizer.querySelectorAll('.nav-btn[id^="nav-"]').forEach(button => button.classList.toggle('active', button.id === `nav-${tabId}`));
    const titles = {
        dashboard: 'Dashboard', events: 'Events', attendees: 'Attendee management',
        registrations: 'Registrations', tickets: 'Tickets', checkin: 'QR check-in', attendance: 'Attendance',
        'organizer-profile': 'Organizer profile'
    };
    document.getElementById('page-title').textContent = titles[tabId] || 'FestPass';
    organizer.querySelector('.sidebar').classList.remove('mobile-open');

    const loaders = {
        dashboard: loadDashboard,
        events: loadEvents,
        attendees: loadAttendees,
        registrations: loadRegistrations,
        tickets: loadTickets,
        attendance: loadAttendancePage,
        'organizer-profile': loadOrganizerProfile
    };
    if (loaders[tabId]) loaders[tabId]();
}

async function fetchCoreData() {
    const [events, attendees, tickets] = await Promise.all([
        apiCall('/api/festpass/events'),
        apiCall('/api/festpass/attendees'),
        apiCall('/api/festpass/tickets')
    ]);
    festPassState.events = events || [];
    festPassState.attendees = attendees || [];
    festPassState.tickets = tickets || [];
}

function registrationCount(eventId) {
    return festPassState.tickets.filter(ticket => ticket.event?.id === eventId).length;
}

function eventStatus(event, registrations) {
    if (registrations >= Number(event.capacity || 0)) return 'FULL';
    const eventDate = new Date(`${event.date}T23:59:59`);
    if (event.date && !Number.isNaN(eventDate.getTime()) && eventDate < new Date()) return 'PAST';
    return 'OPEN';
}

async function loadEvents() {
    const tbody = document.querySelector('#events-table tbody');
    showLoading(tbody);
    try {
        const [events, tickets] = await Promise.all([
            apiCall('/api/festpass/events'), apiCall('/api/festpass/tickets')
        ]);
        festPassState.events = events || [];
        festPassState.tickets = tickets || [];
        if (!events.length) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-cell">No events yet. Create your first event above.</td></tr>';
            return;
        }
        tbody.innerHTML = events.map(event => {
            const count = registrationCount(event.id);
            const status = eventStatus(event, count);
            return `<tr>
                <td><strong>#${event.id}</strong></td><td><strong>${escapeHtml(event.name)}</strong></td>
                <td>${formatEventDate(event.date)}</td><td>${escapeHtml(event.venue)}</td>
                <td>${Number(event.capacity) || 0}</td><td>${formatMoney(event.ticketPrice)}</td>
                <td>${count} / ${Number(event.capacity) || 0}</td><td><span class="event-status status-${status.toLowerCase()}">${status}</span></td>
                <td class="table-actions"><button class="action-btn btn-edit" type="button" title="Edit event" aria-label="Edit event ${escapeHtml(event.name)}" data-action="edit-event" data-id="${event.id}"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn btn-delete" type="button" title="Delete event" aria-label="Delete event ${escapeHtml(event.name)}" data-action="delete-event" data-id="${event.id}"><i class="fa-solid fa-trash"></i></button></td>
            </tr>`;
        }).join('');
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-cell">Events could not be loaded. Try again.</td></tr>';
    }
}

async function loadAttendees() {
    const tbody = document.querySelector('#attendees-table tbody');
    showLoading(tbody);
    try {
        const [attendees, tickets, events] = await Promise.all([
            apiCall('/api/festpass/attendees'), apiCall('/api/festpass/tickets'), apiCall('/api/festpass/events')
        ]);
        Object.assign(festPassState, { attendees: attendees || [], tickets: tickets || [], events: events || [] });
        const eventFilter = document.getElementById('attendee-event-filter');
        const selectedEvent = eventFilter.value;
        eventFilter.innerHTML = '<option value="">All events</option>' + events.map(event =>
            `<option value="${event.id}">${escapeHtml(event.name)}</option>`).join('');
        eventFilter.value = selectedEvent;
        if (!attendees.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">No attendees registered yet.</td></tr>';
            return;
        }
        const search = document.getElementById('attendee-search').value.trim().toLowerCase();
        const selectedStatus = document.getElementById('attendee-status-filter').value;
        const filteredAttendees = attendees.filter(attendee => {
            const attendeeTickets = tickets.filter(ticket => ticket.attendee?.id === attendee.id);
            const searchable = `${attendee.name} ${attendee.email} ${attendee.phone}`.toLowerCase();
            const matchesEvent = !selectedEvent || attendeeTickets.some(ticket => String(ticket.event?.id) === selectedEvent);
            const matchesStatus = !selectedStatus || (selectedStatus === 'NONE'
                ? attendeeTickets.length === 0
                : attendeeTickets.some(ticket => ticket.status === selectedStatus));
            return (!search || searchable.includes(search)) && matchesEvent && matchesStatus;
        });
        tbody.innerHTML = filteredAttendees.length ? filteredAttendees.map(attendee => {
            const attendeeTickets = tickets.filter(ticket => ticket.attendee?.id === attendee.id);
            const eventNames = attendeeTickets.map(ticket => escapeHtml(ticket.event?.name || 'Event unavailable')).join('<br>') || '<span class="table-muted">No registration</span>';
            const ticketIds = attendeeTickets.map(ticket => `#${ticket.id}`).join('<br>') || '<span class="table-muted">—</span>';
            const statuses = attendeeTickets.map(ticket => statusBadge(ticket.status)).join('<br>') || '<span class="table-muted">—</span>';
            const checkins = attendeeTickets.map(ticket => ticket.status === 'USED' ? '<span class="checkin-label checked">Checked in</span>' : '<span class="checkin-label">Not checked in</span>').join('<br>') || '<span class="table-muted">—</span>';
            return `<tr>
                <td><div class="attendee-cell"><span class="table-avatar">${escapeHtml((attendee.name || '?').trim().charAt(0).toUpperCase())}</span><span><strong>${escapeHtml(attendee.name)}</strong><small>ID #${attendee.id}</small></span></div></td>
                <td>${escapeHtml(attendee.email)}</td><td>${escapeHtml(attendee.phone)}</td>
                <td>${eventNames}</td><td>${ticketIds}</td><td>${statuses}</td><td>${checkins}</td>
                <td class="table-actions"><button class="action-btn btn-edit" type="button" title="Edit attendee" aria-label="Edit attendee ${escapeHtml(attendee.name)}" data-action="edit-attendee" data-id="${attendee.id}"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn btn-delete" type="button" title="Delete attendee" aria-label="Delete attendee ${escapeHtml(attendee.name)}" data-action="delete-attendee" data-id="${attendee.id}"><i class="fa-solid fa-trash"></i></button></td>
            </tr>`;
        }).join('') : '<tr><td colspan="8" class="empty-cell">No attendees match these filters.</td></tr>';
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">Attendees could not be loaded. Try again.</td></tr>';
    }
}

function ticketRows(tickets) {
    return tickets.map(ticket => `<tr>
        <td><strong>#${ticket.id}</strong></td><td>${escapeHtml(ticket.event?.name || 'Event unavailable')}</td>
        <td>${escapeHtml(ticket.attendee?.name || 'Attendee unavailable')}</td>
        <td><code class="qr-token">${escapeHtml(ticket.qrCode)}</code></td><td>${formatEventDate(ticket.issuedDate)}</td>
        <td>${statusBadge(ticket.status)}</td>
    </tr>`).join('');
}

async function loadTickets() {
    const tbody = document.querySelector('#tickets-table tbody');
    showLoading(tbody);
    try {
        const tickets = await apiCall('/api/festpass/tickets');
        festPassState.tickets = tickets || [];
        tbody.innerHTML = tickets.length ? ticketRows(tickets) : '<tr><td colspan="6" class="empty-cell">No tickets issued yet.</td></tr>';
        renderRegistrations(tickets);
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Tickets could not be loaded. Try again.</td></tr>';
    }
}

function renderRegistrations(tickets) {
    const tbody = document.querySelector('#registrations-table tbody');
    if (!tbody) return;
    document.getElementById('registration-total').textContent = tickets.length;
    document.getElementById('registration-events').textContent = new Set(tickets.map(ticket => ticket.event?.id).filter(Boolean)).size;
    tbody.innerHTML = tickets.length ? tickets.map(ticket => `<tr>
        <td><strong>#${ticket.id}</strong></td><td>${escapeHtml(ticket.attendee?.name || 'Attendee unavailable')}</td>
        <td>${escapeHtml(ticket.event?.name || 'Event unavailable')}</td><td>${formatEventDate(ticket.issuedDate)}</td>
        <td>${statusBadge(ticket.status)}</td><td>${ticket.status === 'USED' ? '<span class="checkin-label checked">Checked in</span>' : '<span class="checkin-label">Not checked in</span>'}</td>
    </tr>`).join('') : '<tr><td colspan="6" class="empty-cell">Registrations appear here after a ticket is issued.</td></tr>';
}

async function loadRegistrations() {
    const tbody = document.querySelector('#registrations-table tbody');
    showLoading(tbody);
    try {
        const tickets = await apiCall('/api/festpass/tickets');
        festPassState.tickets = tickets || [];
        renderRegistrations(tickets);
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Registrations could not be loaded. Try again.</td></tr>';
    }
}

function renderAttendanceCards(target, reports) {
    if (!reports.length) {
        target.innerHTML = '<div class="empty-state"><i class="fa-regular fa-calendar"></i><h3>No events to report</h3><p>Create an event to see capacity and check-in activity.</p></div>';
        return;
    }
    target.innerHTML = reports.map(report => {
        const capacity = Number(report.capacity) || 0;
        const issued = Number(report.ticketsIssued) || 0;
        const checkedIn = Number(report.checkedIn) || 0;
        const remaining = Math.max(0, capacity - issued);
        const attendancePercent = capacity ? Math.min(100, Math.round(checkedIn / capacity * 100)) : 0;
        const registrationPercent = capacity ? Math.min(100, Math.round(issued / capacity * 100)) : 0;
        return `<article class="attendance-event card">
            <div class="attendance-event-heading"><div><p class="eyebrow">${formatEventDate(report.date)}</p><h3>${escapeHtml(report.eventName)}</h3><p class="text-muted">${escapeHtml(report.venue)}</p></div><span class="event-status status-${eventStatus(report, issued).toLowerCase()}">${eventStatus(report, issued)}</span></div>
            <div class="attendance-metrics"><div><strong>${capacity}</strong><span>Capacity</span></div><div><strong>${issued}</strong><span>Registered</span></div><div><strong>${checkedIn}</strong><span>Checked in</span></div><div><strong>${remaining}</strong><span>Seats left</span></div></div>
            <div class="progress-heading"><span>Registration capacity</span><strong>${registrationPercent}%</strong></div><div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${registrationPercent}%"></div></div>
            <div class="progress-heading"><span>Attendance</span><strong>${attendancePercent}%</strong></div><div class="progress-bar-bg attendance-progress"><div class="progress-bar-fill" style="width:${attendancePercent}%"></div></div>
        </article>`;
    }).join('');
}

async function loadDashboard() {
    const target = document.getElementById('attendance-list');
    showLoading(target, 'Loading event overview...');
    try {
        const [events, attendees, tickets] = await Promise.all([
            apiCall('/api/festpass/events'), apiCall('/api/festpass/attendees'), apiCall('/api/festpass/tickets')
        ]);
        Object.assign(festPassState, { events: events || [], attendees: attendees || [], tickets: tickets || [] });
        document.getElementById('total-events').textContent = events.length;
        document.getElementById('total-tickets').textContent = tickets.length;
        document.getElementById('total-issued').textContent = tickets.length;
        document.getElementById('total-attendees').textContent = attendees.length;
        document.getElementById('total-checked-in').textContent = tickets.filter(ticket => ticket.status === 'USED').length;
        document.getElementById('total-available').textContent = events.reduce((total, event) => total + Math.max(0, Number(event.capacity || 0) - registrationCount(event.id)), 0);
        if (!events.length) {
            target.innerHTML = '<div class="empty-state"><i class="fa-regular fa-calendar"></i><h3>Your next event starts here</h3><p>Create an event to see registrations and check-ins.</p></div>';
            return;
        }
        const reports = await Promise.all(events.map(async event => {
            const report = await apiCall(`/api/festpass/events/${event.id}/attendance`);
            return { ...report, date: event.date, venue: event.venue };
        }));
        festPassState.attendance = reports;
        renderAttendanceCards(target, reports);
    } catch (error) {
        target.innerHTML = '<div class="empty-state"><h3>Overview unavailable</h3><p>Check the connection and try again.</p></div>';
    }
}

async function loadAttendancePage() {
    const target = document.getElementById('attendance-page-list');
    showLoading(target, 'Loading attendance...');
    try {
        const events = await apiCall('/api/festpass/events');
        festPassState.events = events || [];
        const reports = await Promise.all(events.map(async event => {
            const report = await apiCall(`/api/festpass/events/${event.id}/attendance`);
            return { ...report, date: event.date, venue: event.venue };
        }));
        festPassState.attendance = reports;
        renderAttendanceCards(target, reports);
    } catch (error) {
        target.innerHTML = '<div class="empty-state"><h3>Attendance unavailable</h3><p>Check the connection and try again.</p></div>';
    }
}

function loadSavedAttendee() {
    const account = festPassState.account;
    festPassState.currentAttendee = account?.role === 'ATTENDEE' && account.attendeeId
        ? { id: account.attendeeId, name: account.name, email: account.email, phone: account.phone || '' }
        : null;
}

function syncAttendeeProfileForm() {
    const attendee = festPassState.currentAttendee;
    document.getElementById('attendee-profile-label').textContent = attendee ? attendee.name : 'Guest';
    document.getElementById('attendee-welcome-name').textContent = attendee ? `${attendee.name.split(' ')[0]}.` : 'Attendee.';
    document.getElementById('profile-form-title').textContent = attendee ? `Pass for ${attendee.name}` : 'Attendee profile';
    document.getElementById('profile-name').value = attendee?.name || '';
    document.getElementById('profile-email').value = attendee?.email || '';
    document.getElementById('profile-phone').value = attendee?.phone || '';
    document.getElementById('profile-submit').textContent = 'Manage profile';
    document.getElementById('clear-profile').classList.toggle('is-hidden', !attendee);
}

function showAttendeeTab(tabId) {
    document.querySelectorAll('.attendee-page').forEach(page => page.classList.toggle('active', page.id === `attendee-${tabId}`));
    document.querySelectorAll('.attendee-nav [data-attendee-tab]').forEach(button => button.classList.toggle('active', button.dataset.attendeeTab === tabId));
    document.getElementById('attendee-page-title').textContent = attendeePageTitles[tabId] || 'FestPass';
    if (tabId === 'home' || tabId === 'events') loadAttendeeEvents(tabId);
    else if (tabId === 'profile') loadAttendeeProfile();
    else loadAttendeeTickets(tabId);
}

async function loadAttendeeEvents(tabId) {
    const homeTarget = document.getElementById('attendee-home-events');
    const eventsTarget = document.getElementById('attendee-events-grid');
    showLoading(tabId === 'home' ? homeTarget : eventsTarget, 'Finding events...');
    try {
        const events = await apiCall('/api/festpass/events');
        const [availability, myTickets] = await Promise.all([
            Promise.all(events.map(item => apiCall(`/api/festpass/events/${item.id}/availability`))),
            apiCall('/api/festpass/tickets/mine')
        ]);
        Object.assign(festPassState, {
            events: events || [],
            tickets: myTickets || [],
            availability: Object.fromEntries(availability.map(item => [item.eventId, item]))
        });
        document.getElementById('attendee-ticket-count').textContent = myTickets.length;
        document.getElementById('attendee-valid-count').textContent = myTickets.filter(ticket => ticket.status === 'VALID').length;
        document.getElementById('attendee-used-count').textContent = myTickets.filter(ticket => ticket.status === 'USED').length;
        const upcoming = events.filter(event => !event.date || new Date(`${event.date}T23:59:59`) >= new Date());
        renderEventCards(homeTarget, upcoming.slice(0, 3));
        renderEventCards(eventsTarget, filterAttendeeEvents(events));
    } catch (error) {
        const target = tabId === 'home' ? homeTarget : eventsTarget;
        target.innerHTML = '<div class="empty-state"><h3>Events could not be loaded</h3><p>Please try again in a moment.</p></div>';
    }
}

function renderEventCards(target, events) {
    if (!target) return;
    if (!events.length) {
        target.innerHTML = '<div class="empty-state"><i class="fa-regular fa-calendar"></i><h3>No events to show</h3><p>Check back when new campus events are published.</p></div>';
        return;
    }
    target.innerHTML = events.map(event => {
        const capacity = Number(event.capacity) || 0;
        const metrics = festPassState.availability[event.id] || { ticketsIssued: 0, availableSeats: capacity };
        const registrations = Number(metrics.ticketsIssued) || 0;
        const remaining = Number(metrics.availableSeats) || 0;
        const percent = capacity ? Math.min(100, Math.round(registrations / capacity * 100)) : 0;
        const status = eventStatus(event, registrations);
        return `<article class="event-card">
            <div class="event-card-art"><span class="event-status status-${status.toLowerCase()}">${status === 'OPEN' ? 'REGISTRATION OPEN' : status}</span><span class="event-card-number">FP / ${String(event.id).padStart(2, '0')}</span><i class="fa-solid fa-ticket"></i></div>
            <div class="event-card-body"><p class="eyebrow">${formatEventDate(event.date)}</p><h3>${escapeHtml(event.name)}</h3><p class="event-venue"><i class="fa-solid fa-location-dot"></i>${escapeHtml(event.venue)}</p>
                <div class="event-card-facts"><span>${formatMoney(event.ticketPrice)}</span><span>${remaining} seats left</span></div>
                <div class="event-capacity-line"><div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${percent}%"></div></div><span>${registrations} / ${capacity} registered</span></div>
                <div class="event-card-actions"><button class="btn btn-outline" type="button" data-action="view-event" data-id="${event.id}">View details</button><button class="btn btn-primary" type="button" data-action="register-event" data-id="${event.id}" ${status !== 'OPEN' ? 'disabled' : ''}>Register <i class="fa-solid fa-arrow-right"></i></button></div>
            </div>
        </article>`;
    }).join('');
}

function filterAttendeeEvents(events) {
    const query = document.getElementById('event-search').value.trim().toLowerCase();
    const statusFilter = document.getElementById('event-status-filter').value;
    return events.filter(event => {
        const searchable = `${event.name} ${event.venue}`.toLowerCase();
        const registrations = Number(festPassState.availability[event.id]?.ticketsIssued ?? registrationCount(event.id));
        const status = eventStatus(event, registrations);
        return (!query || searchable.includes(query)) && (statusFilter === 'ALL' || statusFilter === status);
    });
}

function applyAttendeeEventFilters() {
    renderEventCards(document.getElementById('attendee-events-grid'), filterAttendeeEvents(festPassState.events));
}

let attendeeFilterTimer;
function scheduleOrganizerAttendeeFilter() {
    clearTimeout(attendeeFilterTimer);
    attendeeFilterTimer = setTimeout(() => {
        if (document.getElementById('attendees').classList.contains('active')) loadAttendees();
    }, 250);
}

function openEventDetails(id) {
    const event = festPassState.events.find(item => item.id === Number(id));
    if (!event) return;
    festPassState.currentEventId = event.id;
    const capacity = Number(event.capacity) || 0;
    const metrics = festPassState.availability[event.id] || { ticketsIssued: 0, availableSeats: capacity };
    const registrations = Number(metrics.ticketsIssued) || 0;
    const remaining = Number(metrics.availableSeats) || 0;
    const status = eventStatus(event, registrations);
    document.getElementById('event-details-content').innerHTML = `<div class="detail-art"><span>FESTPASS / EVENT ${String(event.id).padStart(2, '0')}</span><i class="fa-solid fa-ticket"></i></div>
        <p class="eyebrow">${formatEventDate(event.date)}</p><h2>${escapeHtml(event.name)}</h2>
        <div class="detail-facts"><div><i class="fa-solid fa-location-dot"></i><span><small>VENUE</small><strong>${escapeHtml(event.venue)}</strong></span></div><div><i class="fa-solid fa-indian-rupee-sign"></i><span><small>TICKET PRICE</small><strong>${formatMoney(event.ticketPrice)}</strong></span></div><div><i class="fa-solid fa-users"></i><span><small>CAPACITY</small><strong>${capacity}</strong></span></div><div><i class="fa-solid fa-chair"></i><span><small>SEATS AVAILABLE</small><strong>${remaining}</strong></span></div></div>
        <div class="detail-registration"><span>${registrations} registrations</span><span class="event-status status-${status.toLowerCase()}">${status}</span></div>
        <button class="btn btn-primary btn-block" type="button" data-action="register-event" data-id="${event.id}" ${status !== 'OPEN' ? 'disabled' : ''}>Register now <i class="fa-solid fa-arrow-right"></i></button>
        <p class="detail-disclaimer">Registration creates a ticket using your attendee details. Availability is confirmed by the existing ticket service.</p>`;
    document.getElementById('event-details-dialog').showModal();
}

function closeEventDetails() {
    document.getElementById('event-details-dialog').close();
}

async function loadAttendeeTickets(tabId) {
    const targetIds = {
        registrations: 'attendee-registrations-list',
        tickets: 'attendee-tickets-list',
        status: 'attendee-status-list'
    };
    const target = document.getElementById(targetIds[tabId]);
    showLoading(target, 'Loading your tickets...');
    try {
        const tickets = await apiCall('/api/festpass/tickets/mine');
        festPassState.tickets = tickets || [];
        const attendeeId = festPassState.currentAttendee?.id;
        const mine = tickets || [];
        document.getElementById('attendee-ticket-count').textContent = mine.length;
        document.getElementById('attendee-valid-count').textContent = mine.filter(ticket => ticket.status === 'VALID').length;
        document.getElementById('attendee-used-count').textContent = mine.filter(ticket => ticket.status === 'USED').length;
        if (!attendeeId) {
            target.innerHTML = '<div class="empty-state"><i class="fa-regular fa-id-card"></i><h3>Set up your attendee details first</h3><p>Use the attendee details form on Home to find your tickets.</p><button class="btn btn-primary" type="button" data-attendee-tab="home">Go to Home</button></div>';
            return;
        }
        if (!mine.length) {
            target.innerHTML = '<div class="empty-state"><i class="fa-solid fa-ticket"></i><h3>No tickets yet</h3><p>Explore events and register to see your digital pass here.</p><button class="btn btn-primary" type="button" data-attendee-tab="events">Explore events</button></div>';
            return;
        }
        if (tabId === 'tickets') {
            target.innerHTML = mine.map(renderAttendeeTicket).join('');
            renderQrCodes(target);
        } else if (tabId === 'status') {
            target.innerHTML = mine.map(ticket => `<article class="status-record card"><div class="status-record-icon ${ticket.status === 'USED' ? 'is-used' : ''}"><i class="fa-solid ${ticket.status === 'USED' ? 'fa-check' : 'fa-ticket'}"></i></div><div class="status-record-copy"><p class="eyebrow">TICKET #${ticket.id}</p><h3>${escapeHtml(ticket.event?.name || 'Event unavailable')}</h3><p>${formatEventDate(ticket.event?.date)} <span>·</span> ${escapeHtml(ticket.event?.venue || '')}</p></div><div class="status-record-state">${statusBadge(ticket.status)}<span>${ticket.status === 'USED' ? 'Your entry has been recorded.' : 'Your ticket is ready for entry.'}</span></div></article>`).join('');
        } else {
            target.innerHTML = mine.map(ticket => `<article class="registration-record card"><div class="record-date"><strong>${new Date(`${ticket.event?.date || ticket.issuedDate}T00:00:00`).getDate() || '—'}</strong><span>${new Date(`${ticket.event?.date || ticket.issuedDate}T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })}</span></div><div class="record-main"><p class="eyebrow">TICKET #${ticket.id}</p><h3>${escapeHtml(ticket.event?.name || 'Event unavailable')}</h3><p><i class="fa-solid fa-location-dot"></i> ${escapeHtml(ticket.event?.venue || 'Venue unavailable')}</p></div><div class="record-state">${statusBadge(ticket.status)}<span>${formatEventDate(ticket.issuedDate)}</span></div><button class="action-btn" type="button" title="View ticket" aria-label="View ticket ${ticket.id}" data-attendee-tab="tickets"><i class="fa-solid fa-arrow-right"></i></button></article>`).join('');
        }
    } catch (error) {
        target.innerHTML = '<div class="empty-state"><h3>Your tickets could not be loaded</h3><p>Please try again in a moment.</p></div>';
    }
}

function renderAttendeeTicket(ticket) {
    return `<article class="attendee-ticket"><div class="ticket-topline"><span class="brand-lockup"><span class="brand-mark"><i class="fa-solid fa-ticket"></i></span> FESTPASS</span><span class="ticket-type">DIGITAL ENTRY PASS</span></div><div class="ticket-event-name"><p class="eyebrow">${formatEventDate(ticket.event?.date)}</p><h2>${escapeHtml(ticket.event?.name || 'Event unavailable')}</h2><p><i class="fa-solid fa-location-dot"></i> ${escapeHtml(ticket.event?.venue || 'Venue unavailable')}</p></div><div class="ticket-qr-wrap"><div class="ticket-qr-render" data-qr-value="${escapeHtml(ticket.qrCode)}"></div><code>${escapeHtml(ticket.qrCode)}</code></div><div class="ticket-bottomline"><div><small>ATTENDEE</small><strong>${escapeHtml(ticket.attendee?.name || festPassState.currentAttendee?.name)}</strong></div><div><small>TICKET ID</small><strong>#${ticket.id}</strong></div><div><small>STATUS</small>${statusBadge(ticket.status)}</div></div><p class="ticket-fineprint">Present this ticket at the event entrance. Each ticket is valid for one entry.</p></article>`;
}

function renderQrCodes(container) {
    if (typeof QRCode === 'undefined') return;
    container.querySelectorAll('.ticket-qr-render').forEach(element => {
        const token = element.dataset.qrValue;
        if (token) new QRCode(element, { text: token, width: 136, height: 136, colorDark: '#24382b', colorLight: '#fffef9', correctLevel: QRCode.CorrectLevel.M });
    });
}

async function handleAttendeeProfileSubmit(event) {
    event.preventDefault();
    const submit = document.getElementById('profile-submit');
    submit.disabled = true;
    submit.innerHTML = '<span class="loading-spinner"></span> Saving...';
    const details = {
        name: document.getElementById('profile-name').value.trim(),
        email: document.getElementById('profile-email').value.trim(),
        phone: document.getElementById('profile-phone').value.trim()
    };
    try {
        const account = await apiCall('/api/auth/profile', 'PUT', details);
        setAccount(account);
        syncAttendeeProfileForm();
        showToast('Attendee profile updated');
        showAttendeeTab('home');
    } catch (error) {
        // apiCall displays the backend error; do not show a success state.
    } finally {
        submit.disabled = false;
        submit.textContent = 'Manage profile';
    }
}

async function registerForEvent(eventId, button) {
    const attendee = festPassState.currentAttendee;
    if (!attendee) {
        closeEventDetails();
        showToast('Your attendee profile is not linked to this account.', 'error');
        return;
    }
    if (button) {
        button.disabled = true;
        button.innerHTML = '<span class="loading-spinner"></span> Registering...';
    }
    try {
        await apiCall('/api/festpass/tickets', 'POST', {
            eventId: Number(eventId), attendeeId: Number(attendee.id)
        });
        closeEventDetails();
        showToast('Ticket generated successfully');
        await loadAttendeeEvents('home');
        showAttendeeTab('tickets');
    } catch (error) {
        // apiCall displays the backend error; capacity and validation stay server-controlled.
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = 'Register <i class="fa-solid fa-arrow-right"></i>';
        }
    }
}

function clearAttendeeProfile() {
    showAttendeeTab('profile');
}

document.addEventListener('click', event => {
    const attendeeNav = event.target.closest('[data-attendee-tab]');
    if (attendeeNav) {
        showAttendeeTab(attendeeNav.dataset.attendeeTab);
        return;
    }
    const action = event.target.closest('[data-action]');
    if (!action) return;
    const id = Number(action.dataset.id);
    if (action.dataset.action === 'view-event') openEventDetails(id);
    else if (action.dataset.action === 'register-event') registerForEvent(id, action);
    else if (action.dataset.action === 'delete-event') deleteEvent(id);
    else if (action.dataset.action === 'delete-attendee') deleteAttendee(id);
    else if (action.dataset.action === 'edit-event') {
        const item = festPassState.events.find(eventItem => eventItem.id === id);
        if (item) editEvent(item.id, item.name, item.date, item.venue, item.capacity, item.ticketPrice);
    } else if (action.dataset.action === 'edit-attendee') {
        const item = festPassState.attendees.find(attendee => attendee.id === id);
        if (item) editAttendee(item.id, item.name, item.email, item.phone);
    }
});

document.getElementById('attendee-date').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

async function refreshCsrfToken() {
    const response = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Could not initialize secure session. Refresh the page.');
    return response.json();
}

function setAccount(account) {
    festPassState.account = account;
    loadSavedAttendee();
    syncAttendeeProfileForm();
    updateAccountUi();
}

function updateAccountUi() {
    const account = festPassState.account;
    if (!account) return;
    document.querySelector('#organizer-portal .profile-name').textContent = account.name;
    document.querySelector('#organizer-portal .avatar').textContent = account.name.trim().charAt(0).toUpperCase();
    document.getElementById('organizer-profile-name').value = account.name;
    document.getElementById('organizer-profile-email').value = account.email;
    document.getElementById('attendee-profile-label').textContent = account.name;
    document.getElementById('account-profile-name').value = account.name;
    document.getElementById('account-profile-email').value = account.email;
    document.getElementById('account-profile-phone').value = account.phone || '';
}

function showAuthScreen(message = '') {
    festPassState.account = null;
    festPassState.currentAttendee = null;
    document.getElementById('auth-screen').classList.remove('is-hidden');
    document.getElementById('portal-selection').classList.add('is-hidden');
    document.getElementById('organizer-portal').classList.add('is-hidden');
    document.getElementById('attendee-portal').classList.add('is-hidden');
    if (message) showAuthView('login', message);
}

function showAuthView(view, message = '') {
    const register = view === 'register';
    document.querySelectorAll('[data-auth-view]').forEach(button => {
        const selected = button.dataset.authView === view;
        if (button.classList.contains('auth-tab')) {
            button.classList.toggle('active', selected);
            button.setAttribute('aria-selected', String(selected));
        }
    });
    document.getElementById('login-panel').classList.toggle('active', !register);
    document.getElementById('register-panel').classList.toggle('active', register);
    document.getElementById('login-error').textContent = register ? '' : message;
    document.getElementById('register-error').textContent = register ? message : '';
}

async function initializeAuth() {
    document.getElementById('auth-screen').classList.remove('is-hidden');
    try {
        await refreshCsrfToken();
        const account = await apiCall('/api/auth/me');
        setAccount(account);
        enterPortal(account.role.toLowerCase());
    } catch (error) {
        showAuthScreen();
    }
}

document.querySelectorAll('[data-auth-view]').forEach(button => {
    button.addEventListener('click', () => showAuthView(button.dataset.authView));
});

document.querySelectorAll('input[name="role"]').forEach(input => {
    input.addEventListener('change', () => {
        const organizerSelected = document.querySelector('input[name="role"]:checked')?.value === 'ORGANIZER';
        document.getElementById('organizer-code-field').classList.toggle('is-hidden', !organizerSelected);
        document.getElementById('organizer-code').required = organizerSelected;
    });
});

document.getElementById('auth-register-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    const fields = new FormData(form);
    document.getElementById('register-error').textContent = '';
    submit.disabled = true;
    submit.innerHTML = '<span class="loading-spinner"></span> Creating account...';
    try {
        await apiCall('/api/auth/register', 'POST', {
            name: fields.get('name'),
            email: fields.get('email'),
            password: fields.get('password'),
            confirmPassword: fields.get('confirmPassword'),
            role: fields.get('role'),
            organizerCode: fields.get('organizerCode')
        });
        document.getElementById('login-email').value = fields.get('email');
        showAuthView('login', 'Account created. Log in to continue.');
        form.reset();
        document.getElementById('organizer-code-field').classList.add('is-hidden');
        document.getElementById('organizer-code').required = false;
    } catch (error) {
        document.getElementById('register-error').textContent = error.message;
    } finally {
        submit.disabled = false;
        submit.innerHTML = 'Create account <i class="fa-solid fa-arrow-right"></i>';
    }
});

document.getElementById('auth-login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    document.getElementById('login-error').textContent = '';
    submit.disabled = true;
    submit.innerHTML = '<span class="loading-spinner"></span> Signing in...';
    try {
        const account = await apiCall('/api/auth/login', 'POST', {
            email: form.elements.email.value,
            password: form.elements.password.value
        });
        await refreshCsrfToken();
        setAccount(account);
        form.reset();
        enterPortal(account.role.toLowerCase());
    } catch (error) {
        document.getElementById('login-error').textContent = error.status === 401
            ? 'Invalid email or password.'
            : error.message;
    } finally {
        submit.disabled = false;
        submit.innerHTML = 'Log in <i class="fa-solid fa-arrow-right"></i>';
    }
});

async function logout() {
    try {
        await apiCall('/api/auth/logout', 'POST');
        await refreshCsrfToken();
        showAuthScreen('You have been logged out.');
        showToast('Logged out successfully');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function loadOrganizerProfile() {
    if (!festPassState.account) return;
    updateAccountUi();
}

async function loadAttendeeProfile() {
    if (!festPassState.account) return;
    try {
        const account = await apiCall('/api/auth/profile');
        setAccount(account);
    } catch (error) {
        document.getElementById('attendee-account-profile-error').textContent = error.message;
    }
}

document.getElementById('organizer-profile-form').addEventListener('submit', async event => {
    event.preventDefault();
    const message = document.getElementById('organizer-profile-error');
    message.textContent = '';
    try {
        const account = await apiCall('/api/auth/profile', 'PUT', {
            name: document.getElementById('organizer-profile-name').value,
            email: document.getElementById('organizer-profile-email').value
        });
        setAccount(account);
        showToast('Organizer profile updated');
    } catch (error) {
        message.textContent = error.message;
    }
});

document.getElementById('attendee-account-profile-form').addEventListener('submit', async event => {
    event.preventDefault();
    const message = document.getElementById('attendee-account-profile-error');
    message.textContent = '';
    try {
        const account = await apiCall('/api/auth/profile', 'PUT', {
            name: document.getElementById('account-profile-name').value,
            email: document.getElementById('account-profile-email').value,
            phone: document.getElementById('account-profile-phone').value
        });
        setAccount(account);
        showToast('Attendee profile updated');
    } catch (error) {
        message.textContent = error.message;
    }
});

document.getElementById('event-search').addEventListener('input', applyAttendeeEventFilters);
document.getElementById('event-status-filter').addEventListener('change', applyAttendeeEventFilters);
document.getElementById('attendee-search').addEventListener('input', scheduleOrganizerAttendeeFilter);
document.getElementById('attendee-event-filter').addEventListener('change', scheduleOrganizerAttendeeFilter);
document.getElementById('attendee-status-filter').addEventListener('change', scheduleOrganizerAttendeeFilter);

window.onload = initializeAuth;

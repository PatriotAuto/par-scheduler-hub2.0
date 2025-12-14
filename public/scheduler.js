let token = null;
let techs = [];
let allAppointments = []; // New: Store all fetched appointments

function setStatus(msg) {
  const el = document.getElementById('status');
  if (!el) return;
  el.innerHTML = msg ? msg : '';
}

function setLoggedIn(loggedIn) {
  const loginPanel = document.getElementById('loginPanel');
  const controls = document.getElementById('controls');
  const logoutBtn = document.getElementById('logoutBtn');

  if (loggedIn) {
    loginPanel.classList.add('hidden');
    controls.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
  } else {
    loginPanel.classList.remove('hidden');
    controls.classList.add('hidden');
    logoutBtn.classList.add('hidden');
  }
}

async function apiGet(path) {
  const res = await fetch(path, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function handleLogin() {
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;

  if (!email || !password) {
    setStatus('Enter email and password');
    return;
  }

  try {
    setStatus('Logging in...');
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!data.ok) {
      setStatus('Login failed: ' + (data.error || 'Unknown error'));
      return;
    }

    token = data.token;
    setStatus('<strong>Logged in as</strong> ' + data.user.email);
    setLoggedIn(true);

    // Default date: today
    const dateInput = document.getElementById('dateInput');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;

    await loadSchedulerData();
  } catch (err) {
    console.error(err);
    setStatus('Login error: ' + err.message);
  }
}

async function loadSchedulerData() {
  try {
    setStatus('Loading techs and appointments...');

    const dateInput = document.getElementById('dateInput');
    const dateStr = dateInput.value;
    if (!dateStr) {
      setStatus('Please choose a date');
      return;
    }

    // Load techs
    const techRes = await apiGet('/api/techs');
    techs = techRes.techs || [];

    // Load appointments for that date
    const apptRes = await apiGet(`/api/appointments?start=${dateStr}&end=${dateStr}`);
    allAppointments = apptRes.appointments || []; // Store appointments globally

    renderScheduler(dateStr, techs, allAppointments);
    setStatus(`<strong>${allAppointments.length}</strong> appointment(s) on <strong>${dateStr}</strong>`);
  } catch (err) {
    console.error(err);
    setStatus('Error loading scheduler: ' + err.message);
  }
}

function renderScheduler(dateStr, techs, appointments) {
  const container = document.getElementById('schedulerContainer');
  container.innerHTML = '';

  if (!techs.length) {
    container.textContent = 'No techs found. (You may need to create techs in the backend.)';
    return;
  }

  const startHour = 8;  // 8:00
  const endHour = 17;   // 17:00
  const slotMinutes = 30;

  const totalMinutes = (endHour - startHour) * 60;
  const slotsPerDay = totalMinutes / slotMinutes;

  const scheduler = document.createElement('div');
  scheduler.className = 'scheduler';
  scheduler.style.gridTemplateColumns = `120px repeat(${techs.length}, 1fr)`;
  scheduler.style.gridTemplateRows = `30px repeat(${slotsPerDay}, 30px)`;

  // Top-left header cell
  const corner = document.createElement('div');
  corner.className = 'scheduler-header';
  corner.textContent = dateStr;
  scheduler.appendChild(corner);

  // Tech headers
  for (const tech of techs) {
    const th = document.createElement('div');
    th.className = 'scheduler-header';
    th.textContent = tech.name;
    scheduler.appendChild(th);
  }

  const slotCount = slotsPerDay;

  for (let i = 0; i < slotCount; i++) {
    const minutesFromStart = i * slotMinutes;
    const hour = startHour + Math.floor(minutesFromStart / 60);
    const minute = minutesFromStart % 60;
    const label = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    // Time label column
    const timeCell = document.createElement('div');
    timeCell.className = 'time-label';
    timeCell.textContent = label;
    scheduler.appendChild(timeCell);

    // One cell per tech
    for (const tech of techs) {
      const cell = document.createElement('div');
      cell.className = 'time-slot';
      cell.dataset.techId = tech.id;
      cell.dataset.timeLabel = label;
      scheduler.appendChild(cell);
    }
  }

  container.appendChild(scheduler);

  // Render appointments
  const startHourMinutes = startHour * 60;
  const rowHeight = 30;

  appointments.forEach(appt => {
    const techId = appt.techId;
    const startTime = new Date(appt.startTime);
    const endTime = new Date(appt.endTime);

    const apptStartMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const apptEndMinutes = endTime.getHours() * 60 + endTime.getMinutes();

    let startSlotIndex = Math.floor((apptStartMinutes - startHourMinutes) / slotMinutes);
    let endSlotIndex = Math.ceil((apptEndMinutes - startHourMinutes) / slotMinutes);

    if (startSlotIndex < 0) startSlotIndex = 0;
    if (endSlotIndex < startSlotIndex + 1) endSlotIndex = startSlotIndex + 1;
    if (endSlotIndex > slotCount) endSlotIndex = slotCount;

    const durationSlots = endSlotIndex - startSlotIndex;

    // Find the cell for this tech and start slot
    const cells = scheduler.querySelectorAll(`.time-slot[data-tech-id="${techId}"]`);
    const cell = cells[startSlotIndex];
    if (!cell) return;

    const apptDiv = document.createElement('div');
    apptDiv.className = 'appointment';
    apptDiv.textContent = appt.title || 'Appt';
    if (appt.status) {
      apptDiv.dataset.status = appt.status;
    }
    apptDiv.style.height = `${rowHeight * durationSlots - 6}px`;
    apptDiv.dataset.appointmentId = appt.id; // Store appointment ID

    cell.appendChild(apptDiv);
  });
}

// --- Modal Functions ---
function showAppointmentModal(appointmentId) {
  const appt = allAppointments.find(a => a.id === appointmentId);
  if (!appt) return;

  const modal = document.getElementById('appointmentModal');
  document.getElementById('modalTitle').textContent = appt.title || 'N/A';
  document.getElementById('modalTech').textContent = techs.find(t => t.id === appt.techId)?.name || 'N/A';
  document.getElementById('modalStart').textContent = new Date(appt.startTime).toLocaleString();
  document.getElementById('modalEnd').textContent = new Date(appt.endTime).toLocaleString();
  document.getElementById('modalStatus').textContent = appt.status || 'N/A';
  document.getElementById('modalCustomer').textContent = appt.customerName || 'N/A'; // Assuming customerName exists
  document.getElementById('modalService').textContent = appt.serviceName || 'N/A'; // Assuming serviceName exists

  modal.classList.remove('hidden');
}

function hideAppointmentModal() {
  document.getElementById('appointmentModal').classList.add('hidden');
}

function init() {
  document.getElementById('loginBtn').addEventListener('click', handleLogin);
  document.getElementById('refreshBtn').addEventListener('click', loadSchedulerData);
  document.getElementById('logoutBtn').addEventListener('click', () => {
    token = null;
    setLoggedIn(false);
    setStatus('Logged out.');
  });

  // Event listener for appointment clicks (delegated to schedulerContainer)
  document.getElementById('schedulerContainer').addEventListener('click', (event) => {
    const apptElement = event.target.closest('.appointment');
    if (apptElement && apptElement.dataset.appointmentId) {
      showAppointmentModal(apptElement.dataset.appointmentId);
    }
  });

  // Event listener for modal close button
  document.querySelector('#appointmentModal .close-button').addEventListener('click', hideAppointmentModal);

  // Event listener to close modal when clicking outside
  window.addEventListener('click', (event) => {
    const modal = document.getElementById('appointmentModal');
    if (event.target === modal) {
      hideAppointmentModal();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
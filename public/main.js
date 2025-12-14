let token = localStorage.getItem('token');
let currentUser = null;

const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const userInfo = document.getElementById('user-info');
const logoutBtn = document.getElementById('logout-btn');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');
const navLinks = document.querySelectorAll('.nav-link');
const pageContent = document.getElementById('page-content');
const sidebarFab = document.getElementById('sidebar-fab');
init();

async function init() {
  if (!token) {
    showLogin();
    return;
  }

  try {
    const response = await fetch('/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (data.ok) {
      currentUser = data.user;
      hideLogin();
      updateUI();
    } else {
      showLogin();
    }
  } catch (err) {
    showLogin();
  }
}

function showLogin() {
  loginModal.classList.remove('hidden');
}

function hideLogin() {
  loginModal.classList.add('hidden');
}

function updateUI() {
  userInfo.textContent = `${currentUser.email} (${currentUser.role})`;

  navLinks.forEach(link => {
    const allowedRoles = link.dataset.roles;
    if (allowedRoles && !allowedRoles.split(',').includes(currentUser.role)) {
      link.classList.add('hidden');
    } else {
      link.classList.remove('hidden');
    }
  });
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.ok) {
      token = data.token;
      currentUser = data.user;
      localStorage.setItem('token', token);
      hideLogin();
      updateUI();
    } else {
      loginError.textContent = data.error || 'Login failed';
    }
  } catch (err) {
    loginError.textContent = 'Network error';
  }
});

logoutBtn.addEventListener('click', () => {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  showLogin();
  navLinks.forEach(link => link.classList.remove('active'));
  navLinks[0].classList.add('active');
  pageContent.innerHTML = '<h1>Welcome to Patriot Auto</h1><p>Select a section from the sidebar to get started.</p>';
});

function setSidebarCollapsed(collapsed) {
  sidebar.classList.toggle('collapsed', collapsed);
  sidebarFab.classList.toggle('hidden', !collapsed);
}

sidebarToggle.addEventListener('click', () => {
  setSidebarCollapsed(!sidebar.classList.contains('collapsed'));
});

sidebarFab.addEventListener('click', () => {
  setSidebarCollapsed(false);
});

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();

    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    const page = link.dataset.page;
    loadPage(page);

    // Optional: auto-collapse on mobile after clicking a nav item
    if (window.innerWidth <= 768) {
      setSidebarCollapsed(true);
    }
  });
});

function loadPage(page) {
  switch (page) {
    case 'dashboard':
      pageContent.innerHTML = '<h1>Dashboard</h1><p>Overview coming soon...</p>';
      break;
    case 'scheduler':
      pageContent.innerHTML = '<h1>Scheduler</h1><p>Scheduler interface coming soon...</p>';
      break;
    case 'customers':
      pageContent.innerHTML = '<h1>Customers</h1><p>Customer management coming soon...</p>';
      break;
    case 'invoices':
      pageContent.innerHTML = '<h1>Invoices</h1><p>Invoice management coming soon...</p>';
      break;
    case 'estimates':
      pageContent.innerHTML = '<h1>Estimates</h1><p>Estimate management coming soon...</p>';
      break;
    case 'hr':
      window.location.href = '/hr.html';
      break;
    case 'reports':
      pageContent.innerHTML = '<h1>Reports</h1><p>Reports coming soon...</p>';
      break;
    case 'settings':
      pageContent.innerHTML = '<h1>Settings</h1><p>Settings coming soon...</p>';
      break;
    default:
      pageContent.innerHTML = '<h1>Welcome to Patriot Auto</h1><p>Select a section from the sidebar to get started.</p>';
  }
}
const API = 'http://localhost:3000/api';
let allApplications = [];
let currentFilter = 'All';
let currentAppId = null;

window.onload = () => {
  loadCompanies();
  loadApplications();
  loadDashboard();
};

async function loadCompanies() {
  const res = await fetch(`${API}/companies`);
  const companies = await res.json();
  const select = document.getElementById('company_id');
  select.innerHTML = '<option value="">Select Company</option>';
  companies.forEach(c => {
    select.innerHTML += `<option value="${c.company_id}">${c.company_name}</option>`;
  });
}

async function loadApplications() {
  const res = await fetch(`${API}/applications`);
  allApplications = await res.json();
  applyFiltersAndRender();
}

async function loadDashboard() {
  const res = await fetch(`${API}/dashboard`);
  const data = await res.json();
  document.getElementById('count-applied').textContent = 0;
  document.getElementById('count-interview').textContent = 0;
  document.getElementById('count-offer').textContent = 0;
  document.getElementById('count-rejected').textContent = 0;
  data.forEach(item => {
    if (item.status === 'Applied') document.getElementById('count-applied').textContent = item.count;
    if (item.status === 'Interview Scheduled') document.getElementById('count-interview').textContent = item.count;
    if (item.status === 'Offer') document.getElementById('count-offer').textContent = item.count;
    if (item.status === 'Rejected') document.getElementById('count-rejected').textContent = item.count;
  });
}

function applyFiltersAndRender() {
  let data = [...allApplications];
  if (currentFilter !== 'All') {
    data = data.filter(a => a.status === currentFilter);
  }
  const search = document.getElementById('search-input').value.toLowerCase();
  if (search) {
    data = data.filter(a => a.company_name.toLowerCase().includes(search));
  }
  const sort = document.getElementById('sort-select').value;
  if (sort === 'newest') {
    data.sort((a, b) => new Date(b.date_applied) - new Date(a.date_applied));
  } else {
    data.sort((a, b) => new Date(a.date_applied) - new Date(b.date_applied));
  }
  renderTable(data);
}

function searchApplications() { applyFiltersAndRender(); }
function sortApplications() { applyFiltersAndRender(); }

function filterApplications(status) {
  currentFilter = status;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  applyFiltersAndRender();
}

function renderTable(data) {
  const tbody = document.getElementById('table-body');
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:#888">No applications found</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map((app, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>
        <strong class="company-link" onclick="openModal(${app.app_id}, '${app.company_name} - ${app.role}')">
          ${app.company_name}
        </strong>
      </td>
      <td>${app.role}</td>
      <td>${new Date(app.date_applied).toLocaleDateString('en-IN')}</td>
      <td><span class="badge ${getBadgeClass(app.status)}">${app.status}</span></td>
      <td>${app.salary_range || '-'}</td>
      <td>${app.notes || '-'}</td>
      <td>
        <select class="status-select" onchange="updateStatus(${app.app_id}, this.value)">
          <option ${app.status === 'Applied' ? 'selected' : ''}>Applied</option>
          <option ${app.status === 'Interview Scheduled' ? 'selected' : ''}>Interview Scheduled</option>
          <option ${app.status === 'Offer' ? 'selected' : ''}>Offer</option>
          <option ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
        </select>
      </td>
      <td><button class="delete-btn" onclick="deleteApplication(${app.app_id})">Delete</button></td>
    </tr>
  `).join('');
}

function getBadgeClass(status) {
  if (status === 'Applied') return 'badge-applied';
  if (status === 'Interview Scheduled') return 'badge-interview';
  if (status === 'Offer') return 'badge-offer';
  if (status === 'Rejected') return 'badge-rejected';
  return '';
}

async function updateStatus(id, newStatus) {
  const app = allApplications.find(a => a.app_id === id);
  await fetch(`${API}/applications/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus, notes: app.notes })
  });
  loadApplications();
  loadDashboard();
}

async function addApplication() {
  const company_id = document.getElementById('company_id').value;
  const role = document.getElementById('role').value;
  const date_applied = document.getElementById('date_applied').value;
  const status = document.getElementById('status').value;
  const salary_range = document.getElementById('salary_range').value;
  const notes = document.getElementById('notes').value;
  if (!company_id || !role || !date_applied) {
    alert('Please fill Company, Role and Date!');
    return;
  }
  const res = await fetch(`${API}/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_id, role, date_applied, status, salary_range, notes })
  });
  const data = await res.json();
  alert(data.message);
  document.getElementById('role').value = '';
  document.getElementById('date_applied').value = '';
  document.getElementById('salary_range').value = '';
  document.getElementById('notes').value = '';
  loadApplications();
  loadDashboard();
}

async function deleteApplication(id) {
  if (!confirm('Are you sure you want to delete this application?')) return;
  const res = await fetch(`${API}/applications/${id}`, { method: 'DELETE' });
  const data = await res.json();
  alert(data.message);
  loadApplications();
  loadDashboard();
}

async function openModal(appId, title) {
  currentAppId = appId;
  document.getElementById('modal-title').textContent = `📋 ${title}`;
  document.getElementById('modal-overlay').style.display = 'flex';
  document.getElementById('round-number').value = '';
  document.getElementById('interview-date').value = '';
  document.getElementById('interview-outcome').value = '';
  await loadInterviews(appId);
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  currentAppId = null;
}

async function loadInterviews(appId) {
  const res = await fetch(`${API}/interviews/${appId}`);
  const interviews = await res.json();
  const list = document.getElementById('interview-list');
  if (interviews.length === 0) {
    list.innerHTML = `<p class="no-interviews">No interview rounds added yet. Add your first round below!</p>`;
    return;
  }
  list.innerHTML = `
    <table class="interview-table">
      <thead>
        <tr><th>Round</th><th>Date</th><th>Outcome</th><th>Action</th></tr>
      </thead>
      <tbody>
        ${interviews.map(i => `
          <tr>
            <td>Round ${i.round_number}</td>
            <td>${i.interview_date ? new Date(i.interview_date).toLocaleDateString('en-IN') : '-'}</td>
            <td>${i.outcome || '-'}</td>
            <td><button class="delete-btn" onclick="deleteInterview(${i.interview_id})">Delete</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function addInterview() {
  const round_number = document.getElementById('round-number').value;
  const interview_date = document.getElementById('interview-date').value;
  const outcome = document.getElementById('interview-outcome').value;
  if (!round_number) {
    alert('Please enter round number!');
    return;
  }
  await fetch(`${API}/interviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: currentAppId, round_number, interview_date, outcome })
  });
  document.getElementById('round-number').value = '';
  document.getElementById('interview-date').value = '';
  document.getElementById('interview-outcome').value = '';
  await loadInterviews(currentAppId);
}

async function deleteInterview(id) {
  if (!confirm('Delete this interview round?')) return;
  await fetch(`${API}/interviews/${id}`, { method: 'DELETE' });
  await loadInterviews(currentAppId);
}
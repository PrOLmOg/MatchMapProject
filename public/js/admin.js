// public/js/admin.js

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('You must be logged in as admin to view this page.');
    window.location.href = 'login.html';
    return;
  }

  // Initialize references
  const matchForm = document.getElementById('matchForm');
  const matchFormTitle = document.getElementById('matchFormTitle');
  const matchFormSubmitBtn = document.getElementById('matchFormSubmitBtn');
  const adminAlert = document.getElementById('adminAlert');

  // Load all matches on page load
  loadMatches();

  // Form submission listener
  matchForm.addEventListener('submit', handleMatchFormSubmit);

  // Hide alert on page load
  hideAlert();
});

/**
 * Load all matches from the server and display in the table
 */
async function loadMatches() {
  try {
    const response = await fetch('http://localhost:5000/api/admin/matches', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch matches. Ensure you have admin privileges.');
    }

    const matches = await response.json();
    console.log('[admin.js] Matches fetched:', matches);

    renderMatchesTable(matches);
  } catch (error) {
    showAlert('danger', error.message);
  }
}

/**
 * Render the matches in a table
 * @param {Array} matches - The list of matches from the server
 */
function renderMatchesTable(matches) {
  const tableBody = document.querySelector('#matchesTable tbody');
  tableBody.innerHTML = ''; // Clear existing rows

  matches.forEach(match => {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${match.id}</td>
      <td>${match.team_home}</td>
      <td>${match.team_away}</td>
      <td>${match.competition_name}</td>
      <td>${new Date(match.match_date).toLocaleString()}</td>
      <td>${match.stadium_name}</td>
      <td>
        <button class="btn btn-sm btn-info me-2" onclick="startEditMatch('${match.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteMatch('${match.id}')">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

/**
 * Start editing an existing match: fill the form with match data
 * @param {string} matchId - The ID of the match to edit
 */
async function startEditMatch(matchId) {
  try {
    const response = await fetch(`http://localhost:5000/api/admin/matches/${matchId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch match details.');
    }
    const match = await response.json();

    // Fill the form
    document.getElementById('matchId').value = match.id;
    document.getElementById('homeTeam').value = match.team_home;
    document.getElementById('awayTeam').value = match.team_away;
    document.getElementById('competitionName').value = match.competition_name;
    document.getElementById('matchDate').value = formatDateTimeLocal(match.match_date);
    document.getElementById('stadiumName').value = match.stadium_name;

    // Update form title and button text
    document.getElementById('matchFormTitle').textContent = 'Edit Match';
    document.getElementById('matchFormSubmitBtn').textContent = 'Update Match';
  } catch (error) {
    showAlert('danger', error.message);
  }
}

/**
 * Handle form submission for Add or Update
 * @param {Event} e - the form submission event
 */
async function handleMatchFormSubmit(e) {
  e.preventDefault();
  hideAlert(); // Hide any previous alert

  // Grab form values
  const matchId = document.getElementById('matchId').value.trim();
  const team_home = document.getElementById('homeTeam').value.trim();
  const team_away = document.getElementById('awayTeam').value.trim();
  const competition_name = document.getElementById('competitionName').value.trim();
  const match_date = document.getElementById('matchDate').value;  // local datetime
  const stadium_name = document.getElementById('stadiumName').value.trim();

  // Basic validation
  if (!team_home || !team_away || !competition_name || !match_date || !stadium_name) {
    showAlert('danger', 'Please fill in all required fields.');
    return;
  }

  // Convert local datetime to ISO
  const isoDate = new Date(match_date).toISOString();

  const matchData = {
    team_home,
    team_away,
    competition_name,
    match_date: isoDate,
    stadium_name
  };

  try {
    let url = '/api/admin/matches';
    let method = 'POST';

    if (matchId) {
      // Updating an existing match
      url = `/api/admin/matches/${matchId}`;
      method = 'PUT';
    }

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(matchData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save match.');
    }

    // Clear form
    matchForm.reset();
    document.getElementById('matchId').value = '';
    document.getElementById('matchFormTitle').textContent = 'Add New Match';
    document.getElementById('matchFormSubmitBtn').textContent = 'Add Match';

    // Reload matches
    loadMatches();
    showAlert('success', 'Match saved successfully!');
  } catch (error) {
    showAlert('danger', error.message);
  }
}

/**
 * Delete a match by ID
 * @param {string} matchId - The ID of the match to delete
 */
async function deleteMatch(matchId) {
  if (!confirm('Are you sure you want to delete this match?')) {
    return;
  }
  try {
    const response = await fetch(`http://localhost:5000/api/admin/matches/${matchId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete match.');
    }
    showAlert('success', 'Match deleted successfully.');
    loadMatches();
  } catch (error) {
    showAlert('danger', error.message);
  }
}

/**
 * Utility function: Show a Bootstrap alert
 * @param {string} type - 'success', 'danger', etc.
 * @param {string} message - The alert message
 */
function showAlert(type, message) {
  const adminAlert = document.getElementById('adminAlert');
  adminAlert.className = `alert alert-${type}`;
  adminAlert.textContent = message;
  adminAlert.classList.remove('d-none');

  // Automatically hide the alert after 5 seconds
  setTimeout(() => {
    adminAlert.classList.add('d-none');
    adminAlert.textContent = '';
  }, 5000);
}

/**
 * Hide the alert
 */
function hideAlert() {
  const adminAlert = document.getElementById('adminAlert');
  adminAlert.classList.add('d-none');
  adminAlert.textContent = '';
}

/**
 * Format a date string to match 'datetime-local' input
 * e.g., "2025-03-10T14:30:00Z" -> "2025-03-10T14:30"
 */
function formatDateTimeLocal(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2,'0');
  const day = String(date.getDate()).padStart(2,'0');
  const hours = String(date.getHours()).padStart(2,'0');
  const minutes = String(date.getMinutes()).padStart(2,'0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Logout function: Clears token and redirects to login
 */
function logout() {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
}

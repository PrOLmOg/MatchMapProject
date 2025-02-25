// public/js/map.js

document.addEventListener('DOMContentLoaded', () => {
  initializeMap();

  const logoutBtn = document.getElementById('logoutBtn');
  const adminBtn = document.getElementById('adminBtn');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  } else {
    console.error('Logout button not found in the DOM.');
  }

  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  if (isAdmin && adminBtn) {
    adminBtn.style.display = 'inline-block'; // or 'block'
    adminBtn.addEventListener('click', () => {
      window.location.href = 'admin.html';
    });
  } else if (adminBtn) {
    // If not admin, remove it from the DOM or keep it hidden
    adminBtn.remove();
  }

  // Add filter event listeners
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', applyFilters);
  }

  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearFilters);
  }

});

/**
 * Handles user logout by clearing the token and redirecting to login page.
 */
function logout() {
  localStorage.removeItem('token');
  alert('Logged out successfully.');
  window.location.href = 'login.html';
}

// Global variables to store map, markers, and user location
let map;
let markers;
let userLocation = null; // { lat: ..., lon: ... }
// public/js/map.js

// ... existing code ...

const redFootballIcon = L.icon({
  iconUrl: 'images/football-red.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const yellowFootballIcon = L.icon({
  iconUrl: 'images/football-orange.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const greenFootballIcon = L.icon({
  iconUrl: 'images/football-blue.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});
// ... existing code ...


/**
 * Initializes the Leaflet map, adds tile layers, and sets up marker clustering.
 */
function initializeMap() {
  console.log('[map.js] Initializing map.');

  map = L.map('map', {
    center: [20, 0],
    zoom: 2,
    zoomControl: false // 1) Disable default zoom control
  });
  
  // 2) Re-add zoom control at desired corner
  L.control.zoom({
    position: 'topright' // or 'bottomright' or 'bottomleft'
  }).addTo(map);
  
  const locateControl = L.control.locate({
    position: 'topright',  // put it near the zoom buttons
    flyTo: true,           // animate the map to the user location
    strings: {
      title: "Show me where I am"  // tooltip when you hover over the button
    }
  }).addTo(map);

  // Listen for locationfound event from the locate control
  map.on('locationfound', (e) => {
    // The event contains latitude and longitude
    userLocation = { lat: e.latitude, lon: e.longitude };
    console.log('[map.js] map locationfound => userLocation:', userLocation);
  });

  // Add Carto’s “Voyager” tile layer
  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    {
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
    }
  ).addTo(map);
  
  console.log('[map.js] OpenStreetMap tile layer added.');

  // Initialize Marker Cluster Group
  markers = L.markerClusterGroup();

  // Add marker cluster group to the map
  map.addLayer(markers);
  console.log('[map.js] MarkerClusterGroup initialized and added to the map.');

  // Fetch matches without any filters initially
  fetchMatches();
}

/**
 * Applies the selected filters and fetches the corresponding matches.
 */
function applyFilters() {
  // Grab values from filter inputs
  const league = document.getElementById('leagueSelect').value;
  const team = document.getElementById('teamInput').value.trim();
  const radius = document.getElementById('radiusInput').value.trim(); // in km
  const dateFrom = document.getElementById('dateFrom').value; // e.g. "2025-01-15"
  const dateTo = document.getElementById('dateTo').value;     // e.g. "2025-02-10"

  // Validate radius if provided
  if (radius && isNaN(radius)) {
    showAlert('danger', 'Please enter a valid number for radius.');
    return;
  }

  // Build query params
  const params = new URLSearchParams();
  if (league) params.append('league', league);
  if (team) params.append('team', team);
  if (radius) {
    if (!userLocation) {
      showAlert('warning', 'Please allow location access and click "Show My Location" before applying a radius filter.');
      return;
    }
    params.append('lat', userLocation.lat);
    params.append('lon', userLocation.lon);
    params.append('radius', radius);
  }
  // If user chose a start date
  if (dateFrom) {
    params.append('dateFrom', dateFrom);
  }

  // If user chose an end date
  if (dateTo) {
    params.append('dateTo', dateTo);
  }


  // Re-fetch matches with the filters
  fetchMatches(params.toString());
}

/**
 * Clears all filters and fetches all matches again.
 */
function clearFilters() {
  // Reset filter inputs
  document.getElementById('leagueSelect').value = '';
  document.getElementById('teamInput').value = '';
  document.getElementById('radiusInput').value = '';
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value = '';
  // Clear user location if any
  // Optionally, you can decide whether to keep the user location or not
  // Here, we'll keep the user location to allow filtering again if needed

  // Re-fetch matches without any filters
  fetchMatches();
}

/**
 * Fetch matches from the server with optional query parameters.
 * @param {string} queryString - The query string for filters.
 */
async function fetchMatches(queryString = '') {
  console.log('[map.js] Fetching matches with query:', queryString);

  const token = localStorage.getItem('token');
  if (!token) {
    alert('You must be logged in to view matches.');
    window.location.href = 'login.html';
    return;
  }

  // Construct the URL with query params
  let url = '/api/matches';
  if (queryString) {
    url += `?${queryString}`;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('[map.js] Received response:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[map.js] Error response:', errorData);
      throw new Error(errorData.error || 'Failed to fetch matches.');
    }

    const matches = await response.json();
    ~console.log(`[map.js] Retrieved ${matches.length} matches with filters.`, matches);

    // Clear existing markers
    markers.clearLayers();

    if (matches.length === 0) {
      showAlert('warning', 'No upcoming matches available with the applied filters.');
      return;
    }
    const now = Date.now();

    // Iterate through each match and add a marker
    matches.forEach(match => {
      const { team_home, team_away, stadium_name, competition_name, match_date, location, id } = match;
      
      if (!location || !Array.isArray(location.coordinates)) {
        console.warn(`Match ID ${id} missing location data.`);
        return;
      }

      // Expecting [lat, lon]
      const [lat, lon] = location.coordinates;

      // Validate coordinates
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        console.warn(`Match ID ${id} has invalid lat/lon values.`);
        return;
      }
      const matchDate = new Date(match.match_date).getTime();
      const msDiff = matchDate - now; // difference in ms
      const daysUntilMatch = msDiff / (1000 * 60 * 60 * 24); // convert to days
      let iconToUse;
      if (daysUntilMatch < 7) {
        iconToUse = redFootballIcon;    // upcoming 7 days => red
      } else if (daysUntilMatch < 14) {
        iconToUse = yellowFootballIcon; // 7-14 days => yellow
      } else {
        iconToUse = greenFootballIcon;  // 14+ days => green
      }

      // Create a marker
      const marker = L.marker([lat, lon], { icon: iconToUse });

      // Construct the Google Maps Directions URL for this match
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=&destination=${encodeURIComponent(match.stadium_name)}&travelmode=transit`;
      
      // Format match date
      const formattedDate = new Date(match_date).toLocaleString();
      // match info 
      const popupHTML = `
        <div class="match-popup"
             style="background-image: url('images/football-logos/${match.competition_name}.png');">
          <div class="popup-overlay">
            <div class="team-logos">
              <img class="team-logo" src="images/football-logos/logos/${match.competition_name}/${match.team_home}.png" alt="${match.team_home}"/>
              <span class="vs-text">VS</span>
              <img class="team-logo" src="images/football-logos/logos/${match.competition_name}/${match.team_away}.png"alt="${match.team_away}"/>
            </div>
            <div class="match-details">
              <strong>${match.team_home} vs ${match.team_away}</strong><br/>
              <em>${match.competition_name}</em><br/>
              ${new Date(match.match_date).toLocaleString()}<br/>
              Stadium: <a href="${directionsUrl}" target="_blank">${match.stadium_name}</a>
            </div>
          </div>
        </div>
      `;

      // Bind a popup to the marker
      marker.bindPopup(popupHTML);

      // Add marker to the cluster group
      markers.addLayer(marker);
      console.log(`[map.js] Added marker for Match ID ${id}: ${team_home} vs ${team_away}`);
    });

    console.log('[map.js] All markers added to the cluster group.');

    // Fit the map view to the markers
    if (markers.getLayers().length > 0) {
      map.fitBounds(markers.getBounds());
      console.log('[map.js] Map view adjusted to fit all markers.');
    } else {
      console.warn('[map.js] No markers to display on the map.');
    }

  } catch (error) {
    console.error('Error fetching matches:', error);
    showAlert('danger', error.message || 'An error occurred while fetching matches.');
  }
}

/**
 * Shows a Bootstrap alert with the specified type and message.
 * @param {string} type - The type of alert ('success', 'danger', 'warning', etc.).
 * @param {string} message - The message to display in the alert.
 */
function showAlert(type, message) {
  // Remove existing alert classes and add the new one
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.role = 'alert';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  // Insert the alert at the top of the container
  const container = document.querySelector('.container-fluid');
  container.insertBefore(alertDiv, container.firstChild);

  // Optionally, auto-dismiss the alert after some time
  setTimeout(() => {
    alertDiv.classList.remove('show');
    alertDiv.classList.add('hide');
  }, 5000);
}

/**
 * Clears all alerts from the page.
 */
function clearAlerts() {
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => alert.remove());
}

/**
 * Shows the user's current location on the map.
 */
function showUserLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      console.log(`[map.js] Your location: lat=${lat}, lon=${lon}`);

      userLocation = { lat, lon };

      // Create or update a marker for the user location
      if (window.userMarker) {
        map.removeLayer(window.userMarker);
      }

      window.userMarker = L.marker([lat, lon], {
        icon: L.icon({
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png', // Custom icon URL if desired
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          shadowSize: [41, 41]
        })
      }).addTo(map);

      window.userMarker.bindPopup('<strong>You are here!</strong>').openPopup();

      // Optionally, set the view to the user's location
      map.setView([lat, lon], 13);
    },
    err => {
      console.error('Error getting geolocation:', err);
      alert('Unable to retrieve your location.');
    },
    { enableHighAccuracy: true }
  );
}

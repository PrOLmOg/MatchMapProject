// public/js/login.js

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', login);
  } else {
    console.error('Login form not found in the DOM.');
  }
});

/**
 * Handles the login process.
 * @param {Event} event - The form submission event.
 */
async function login(event) {
  event.preventDefault(); // Prevent default form submission

  // Retrieve the username and password values from the form
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const errorAlert = document.getElementById('errorAlert');

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  // Clear any previous error messages
  hideError();

  // Simple validation
  if (!username || !password) {
    showError('Please enter both username and password.');
    return;
  }

  try {
    // Send a POST request to /api/auth/login
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    // Parse JSON response
    const data = await response.json();
    console.log('[login.js] Server Response:', data); // Debugging log

    if (response.ok) {
      // Extract token and isAdmin from response
      const { token, isAdmin } = data;
      console.log('[login.js] isAdmin Flag:', isAdmin); // Debugging log

      if (token) {
        // Store JWT token in localStorage
        localStorage.setItem('token', token);
        console.log('Token stored in localStorage:', token);

        // Store isAdmin in localStorage
      if (isAdmin) {
        localStorage.setItem('isAdmin', 'true');
      } else {
        localStorage.removeItem('isAdmin'); // or set to 'false'
        }

        // Redirect based on user role
        if (isAdmin === true) {
          // Admin user -> admin dashboard
          window.location.href = 'admin.html';
        } else {
          // Regular user -> map
          window.location.href = 'map.html';
        } 
      } else {
        console.error('Login successful but no token received:', data);
        showError('Login successful, but no token received. Please contact support.');
      }
    } else {
      // Authentication failed
      if (data.error) {
        if (data.error.toLowerCase().includes('wrong password')) {
          showError('Incorrect password. Please try again.');
        } else if (data.error.toLowerCase().includes('username')) {
          showError("Username doesn't exist. Please check your username or sign up.");
        } else {
          showError(data.error);
        }
      } else {
        showError('Login failed. Please try again.');
      }
    }
  } catch (error) {
    console.error('An unexpected error occurred during login:', error);
    showError('An unexpected error occurred. Please try again later.');
  }
}

/**
 * Displays an error message in the error alert div.
 * @param {string} message - The error message to display.
 */
function showError(message) {
  const errorAlert = document.getElementById('errorAlert');
  errorAlert.textContent = message;
  errorAlert.classList.remove('d-none');
}

/**
 * Hides the error alert.
 */
function hideError() {
  const errorAlert = document.getElementById('errorAlert');
  errorAlert.textContent = '';
  errorAlert.classList.add('d-none');
}

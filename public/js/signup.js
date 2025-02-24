// public/js/signup.js

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', handleSignUp);
  } else {
    console.error('Signup form not found in the DOM.');
  }
});

/**
 * Handles the sign-up process.
 * @param {Event} event - The form submission event.
 */
async function handleSignUp(event) {
  event.preventDefault(); // Prevent the default form submission behavior

  // Retrieve form values
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const emailInput = document.getElementById('email');
  const countryInput = document.getElementById('country');
  const errorAlert = document.getElementById('errorAlert');

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  const email = emailInput.value.trim();
  const country = countryInput.value.trim();

  // Clear any previous error messages
  hideError();

  // Basic validation to ensure fields are not empty
  if (!username || !password || !email || !country) {
    showError('Please fill in all required fields.');
    return;
  }

  try {
    // Send a POST request to the /api/auth/signup endpoint with the user details
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Specify the content type as JSON
      },
      body: JSON.stringify({ username, password, email, country }), // Send the user details in the request body
    });

    // Parse the JSON response from the server
    const data = await response.json();

    if (response.ok) {
      // Successful sign-up
      alert('Sign up successful! You can now login.');
      window.location.href = 'login.html'; // Redirect to login page
    } else {
      // Sign-up failed
      if (data.error) {
        if (data.error.toLowerCase().includes('username')) {
          showError('Username already taken. Please choose another username.');
        } else if (data.error.toLowerCase().includes('email')) {
          showError('Invalid email address. Please enter a valid email.');
        } else if (data.error.toLowerCase().includes('password')) {
          showError('Password does not meet the requirements.');
        } else {
          showError(data.error);
        }
      } else {
        showError('Sign up failed. Please try again.');
      }
    }
  } catch (error) {
    // Network or other unexpected errors
    console.error('An unexpected error occurred during sign up:', error);
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

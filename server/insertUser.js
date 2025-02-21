// insertUser.js

const db = require('./db');  // Import db.js
const bcrypt = require('bcrypt');  // Import bcrypt for password hashing

const insertUser = async () => {
  const username = 'testuser';  // The username for the new user
  const plainPassword = 'testpassword';  // The plain password you want to hash

  try {
    // Hash the password using bcrypt
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // SQL query to insert the user
    const query = 'INSERT INTO users (username, password) VALUES ($1, $2)';
    
    // Run the query to insert the user
    await db.query(query, [username, hashedPassword]);

    console.log('User inserted successfully!');
  } catch (error) {
    console.error('Error inserting user:', error);
  }
};

// Call the function to insert the user
insertUser();

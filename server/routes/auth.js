// server/routes/auth.js

const express = require('express');
const router = express.Router();
const db = require('../db'); // Adjust path
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRES_IN = '1h';

// SIGNUP ROUTE
router.post('/signup', async (req, res) => {
  const { username, password, email, country } = req.body;
  try {
    // Validate required fields
    if (!username || !password || !email || !country) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // Check if username already exists
    const userCheck = await db.query('SELECT username FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    await db.query(
      'INSERT INTO users (username, password, email, country, role) VALUES ($1, $2, $3, $4, $5)',
      [username, hashedPassword, email, country, 'user']
    );

    // Return success
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/auth/login
 * Authenticates the user and returns a JWT plus isAdmin flag
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const userQuery = 'SELECT username, password, role FROM users WHERE username = $1';
    const userResult = await db.query(userQuery, [username]);

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: "Username doesn't exist" });
    }

    const user = userResult.rows[0];
    // user.role might be 'admin' or 'user'

    // Compare password with hashed password in DB
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Wrong password' });
    }

    // Check if user is admin
    const isAdmin = (user.role === 'admin');

    // Generate JWT
    const token = jwt.sign(
      { username: user.username, isAdmin },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return JSON
    res.json({ token, isAdmin });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

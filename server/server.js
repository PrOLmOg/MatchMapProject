// server/server.js
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '../.env') // the exact file name
});
 // Load environment variables
const db = require('./db');
const express = require('express');
const cors = require('cors');
const app = express();

// Import routes
const authRoutes = require('./routes/auth');
const matchRoutes = require('./routes/matches');
const adminRoutes = require('./routes/admin');

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/admin', adminRoutes);

// Catch-all Route to Serve index.html for Undefined Routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start the Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Test the database connection
db.query('SELECT NOW()')  // This will give you the current timestamp from the database
  .then(res => {
    console.log('Database connected successfully!');
    console.log('Current Time from DB:', res.rows[0].now);
  })
  .catch(err => {
    console.error('Error connecting to the database:', err);
  });


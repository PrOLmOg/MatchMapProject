// server/db.js
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '../.env') // the exact file name
});
const { Pool } = require('pg');


const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Debugging: Log environment variables
console.log('Database Configuration:');
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD); // Should be a string

module.exports = {
  query: (text, params) => pool.query(text, params),
};


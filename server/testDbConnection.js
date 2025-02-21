// Quick test script: server/testDbConnection.js

const db = require('./db');

(async () => {
  try {
    const res = await db.query('SELECT NOW()');
    console.log('Connection successful:', res.rows[0]);
  } catch (err) {
    console.error('Connection error:', err);
  }
})();

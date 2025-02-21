// server/middleware/authenticate.js

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware to authenticate JWT token.
 * Attaches user information to req.user if token is valid.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expect "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('[authenticate.js] Token verification failed:', err);
      return res.status(403).json({ error: 'Invalid access token' });
    }
    req.user = user; // { username, isAdmin, iat, exp }
    next();
  });
}

module.exports = authenticateToken;

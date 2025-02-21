// server/middleware/isAdmin.js

/**
 * Middleware to check if the authenticated user is an admin.
 * Assumes that authenticateToken middleware has already set req.user.
 */
function isAdmin(req, res, next) {
  if (req.user && req.user.isAdmin) {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden: Admins only' });
}

module.exports = isAdmin;

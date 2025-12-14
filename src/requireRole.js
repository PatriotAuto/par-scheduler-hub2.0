// src/requireRole.js
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        ok: false,
        error: 'Forbidden',
        allowedRoles,
        yourRole: req.user.role,
      });
    }

    next();
  };
}

module.exports = { requireRole };
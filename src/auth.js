// src/auth.js
const jwt = require('jsonwebtoken');
const { prisma } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Middleware to protect routes
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // Optionally, re-fetch user from DB to ensure still valid
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, tenantId: true },
    });

    if (!user) {
      return res.status(401).json({ ok: false, error: 'User no longer exists' });
    }

    req.user = user; // attach user to request
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ ok: false, error: 'Invalid token' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
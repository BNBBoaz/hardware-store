// This file protects routes from unauthorized access.
// It has two functions:
// 1. authenticate — checks the token is valid
// 2. authorize — checks the user has the right role

import jwt from 'jsonwebtoken';

// ── AUTHENTICATE ──────────────────────────────
// This runs BEFORE any protected route handler.
// It reads the token the frontend sends, verifies it,
// and attaches the user info to the request object.
export const authenticate = (req, res, next) => {

  // The frontend sends the token in the request header like this:
  // Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
  const authHeader = req.headers.authorization;

  // If there is no header or it does not start with "Bearer ", reject it
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }

  // Split "Bearer eyJhbG..." and take the second part — the actual token
  const token = authHeader.split(' ')[1];

  try {
    // jwt.verify checks two things:
    // 1. Was this token signed with our JWT_SECRET? (not a fake token)
    // 2. Has it expired? (we set 8h expiry in authController)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the decoded data to req.user so route handlers can use it.
    // decoded contains: { userId, role, businessId }
    req.user = decoded;

    // Call next() to move on to the actual route handler
    next();

  } catch (error) {
    // Token expired — user needs to log in again
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    // Token is invalid — it was tampered with or is just wrong
    return res.status(401).json({ error: 'Invalid token. Please log in again.' });
  }
};

// ── AUTHORIZE ─────────────────────────────────
// This runs AFTER authenticate on routes that need specific roles.
// You pass in the roles that ARE allowed to use the route.
//
// How to use it in a route file:
//   router.delete('/users/:id', authenticate, authorize('OWNER'), handler)
//   meaning: only OWNER role can delete users
//
//   router.get('/reports', authenticate, authorize('OWNER','MANAGER','ACCOUNTANT'), handler)
//   meaning: those three roles can view reports
export const authorize = (...allowedRoles) => {

  // This returns a middleware function — same shape as authenticate above
  return (req, res, next) => {

    // req.user was attached by authenticate() just before this runs
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if the user's role is in the list of allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        // 403 = Forbidden — you are logged in but not allowed
        error: `Access denied. Required: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`
      });
    }

    // Role is allowed — move on to the route handler
    next();
  };
};

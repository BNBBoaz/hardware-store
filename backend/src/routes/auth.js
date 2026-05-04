// ─────────────────────────────────────────────
// Auth Routes
// This file maps URLs to controller functions.
// It does NOT contain any logic — just directions.
//
// Think of routes as a reception desk:
// "POST /register? Go to the register function."
// "POST /login? Go to the login function."
// ─────────────────────────────────────────────

import { Router } from 'express';

// Import the three functions we wrote in authController.js
import { register, login, me } from '../controllers/authController.js';

// Import the authenticate middleware we wrote in middleware/auth.js
// We only need authenticate here — me() is the only protected route in auth
import { authenticate } from '../middleware/auth.js';

// Create a router instance — this is a mini Express app for auth routes
const router = Router();

// ── PUBLIC ROUTES ─────────────────────────────
// These routes do NOT require a token.
// Anyone can hit them — that is the point.

// POST http://localhost:5000/api/auth/register
// Body: { businessName, name, email, password }
router.post('/register', register);

// POST http://localhost:5000/api/auth/login
// Body: { email, password }
router.post('/login', login);

// ── PROTECTED ROUTES ──────────────────────────
// authenticate runs FIRST, checks the token.
// If token is valid, me() runs and returns user info.
// If token is invalid, authenticate rejects it and me() never runs.

// GET http://localhost:5000/api/auth/me
// Header: Authorization: Bearer <token>
router.get('/me', authenticate, me);

// Export the router so index.js can use it
export default router;
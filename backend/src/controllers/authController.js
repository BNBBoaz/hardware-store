// ─────────────────────────────────────────────
// Auth Controller
// This file handles everything to do with
// user identity: creating accounts, logging in,
// and fetching the current user's info.
//
// Each function here is called by a route.
// Routes direct traffic. Controllers do the work.
// ─────────────────────────────────────────────

// PrismaClient is our database connection.
// We use it to read and write to PostgreSQL.
import { PrismaClient } from '@prisma/client';

// bcryptjs is used to hash passwords.
// Hashing turns "mypassword123" into a long unreadable string.
// Even we cannot reverse it — that is the point.
import bcrypt from 'bcryptjs';

// jsonwebtoken creates and verifies JWT tokens.
// A JWT token is a signed string we give to the user after login.
// They send it back with every request to prove who they are.
import jwt from 'jsonwebtoken';

// Create one Prisma instance and reuse it.
// Never create a new PrismaClient inside each function — wasteful.
const prisma = new PrismaClient();

// ── HELPER: Generate a JWT token ──────────────
// This is a small reusable function, not a route handler.
// We call it in both register and login so we don't repeat code.
// It packages the user's id, role, and businessId into a token.
const generateToken = (user) => {
  return jwt.sign(
    {
      // These three values are stored INSIDE the token.
      // Any middleware can read them without hitting the database.
      userId:     user.id,
      role:       user.role,
      businessId: user.businessId,
    },
    // JWT_SECRET is a long random string from our .env file.
    // It is used to sign the token so we can verify it is genuine later.
    // If someone changes even one character of the token, verification fails.
    process.env.JWT_SECRET,
    {
      // Token automatically becomes invalid after 8 hours.
      // The user will need to log in again after this.
      expiresIn: '8h'
    }
  );
};

// ── REGISTER ──────────────────────────────────
// POST /api/auth/register
// Called when a new hardware store signs up.
// Creates 4 things in one go:
//   1. A business (the store)
//   2. A main branch (first location)
//   3. An owner user account
//   4. A link between the owner and the branch
export const register = async (req, res) => {
  try {
    // req.body contains the JSON data the client sent.
    // We expect: businessName, name, email, password
    const { businessName, name, email, password } = req.body;

    // Always validate inputs before touching the database.
    // Return early with a clear error if anything is missing.
    if (!businessName || !name || !email || !password) {
      return res.status(400).json({
        // 400 = Bad Request — the client sent incomplete data
        error: 'All fields required: businessName, name, email, password'
      });
    }

    // Check if this email is already registered.
    // We cannot have two users with the same email.
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        // 409 = Conflict — something already exists with that value
        error: 'Email already registered'
      });
    }

    // Hash the password using bcrypt.
    // The number 12 is the "salt rounds" — higher = more secure but slower.
    // 12 is the industry standard balance between speed and security.
    // Result looks like: "$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW"
    const passwordHash = await bcrypt.hash(password, 12);

    // prisma.$transaction runs multiple database operations together.
    // If ANY of them fail, ALL of them are rolled back.
    // This prevents half-created data in the database.
    // Example: if creating the user fails, the business is also deleted.
    const result = await prisma.$transaction(async (tx) => {

      // Step 1: Create the business
      const business = await tx.business.create({
        data: { name: businessName },
      });

      // Step 2: Create the first branch under that business
      const branch = await tx.branch.create({
        data: {
          businessId: business.id,  // link branch to the business we just created
          name:       `${businessName} - Main Branch`,
          isActive:   true,
        },
      });

      // Step 3: Create the owner user account
      const user = await tx.user.create({
        data: {
          businessId:   business.id,  // link user to the business
          name,                        // shorthand for name: name
          email,
          passwordHash,               // store the HASH not the plain password
          role:         'OWNER',      // first user is always the owner
          isActive:     true,
        },
      });

      // Step 4: Link the owner to the main branch
      // This uses the user_branches junction table from our schema.
      await tx.userBranch.create({
        data: {
          userId:   user.id,
          branchId: branch.id,
        },
      });

      // Return all created objects so we can use them outside the transaction
      return { business, branch, user };
    });

    // Generate a JWT token for the new user.
    // They are automatically logged in after registering.
    const token = generateToken(result.user);

    // Send back the token and user info.
    // NEVER send the passwordHash back — strip it from the response.
    res.status(201).json({
      // 201 = Created — something new was successfully created
      message: 'Business registered successfully',
      token,
      user: {
        id:         result.user.id,
        name:       result.user.name,
        email:      result.user.email,
        role:       result.user.role,
        businessId: result.user.businessId,
        // passwordHash is intentionally NOT included here
      },
      business: {
        id:   result.business.id,
        name: result.business.name,
      },
      branch: {
        id:   result.branch.id,
        name: result.branch.name,
      },
    });

  } catch (error) {
    // If anything unexpected goes wrong, log it on the server
    // and send a generic error to the client.
    console.error('Register error:', error);
    res.status(500).json({
      // 500 = Internal Server Error — something broke on our end
      error: 'Registration failed',
      message: error.message
    });
  }
};

// ── LOGIN ─────────────────────────────────────
// POST /api/auth/login
// Called when an existing user signs in.
// Checks their email and password.
// If correct, returns a JWT token they use for all future requests.
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find the user by email.
    // include: fetches related data in the same query (JOIN in SQL terms).
    // We fetch business name and branches so the frontend has everything it needs.
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        business: { select: { id: true, name: true } },
        userBranches: {
          include: {
            branch: { select: { id: true, name: true } }
          }
        },
      },
    });

    // If no user found OR the account is deactivated, reject login.
    // IMPORTANT: We use the SAME error message for both cases.
    // We never tell the client "email not found" because that
    // would help an attacker figure out which emails are registered.
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // bcrypt.compare hashes the submitted password and compares
    // it to the stored hash. Returns true or false.
    // We cannot "decrypt" the stored hash — that is the whole point.
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({
        // 401 = Unauthorized — credentials are wrong
        error: 'Invalid email or password'
      });
    }

    // Password is correct — generate token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id:         user.id,
        name:       user.name,
        email:      user.email,
        role:       user.role,
        businessId: user.businessId,
        business:   user.business,
        // Map the userBranches join data into a clean array of branches
        branches:   user.userBranches.map(ub => ub.branch),
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
};

// ── ME ────────────────────────────────────────
// GET /api/auth/me
// Returns the currently logged-in user's full profile.
// This route is PROTECTED — the client must send a valid JWT token.
//
// The frontend calls this when the page loads to check:
// "Am I still logged in? Who am I? What role do I have?"
export const me = async (req, res) => {
  try {
    // req.user was attached by the authenticate middleware.
    // It contains { userId, role, businessId } decoded from the token.
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        // select: specifies exactly which fields to return.
        // This is safer and faster than returning everything.
        id:         true,
        name:       true,
        email:      true,
        role:       true,
        businessId: true,
        isActive:   true,
        createdAt:  true,
        // Fetch business details too
        business: {
          select: { id: true, name: true, logoUrl: true }
        },
        // Fetch all branches this user is assigned to
        userBranches: {
          include: {
            branch: { select: { id: true, name: true, isActive: true } }
          }
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Clean up the response — flatten userBranches into a simple branches array
    res.json({
      ...user,                                          // spread all user fields
      branches:     user.userBranches.map(ub => ub.branch), // clean branches array
      userBranches: undefined,                          // remove the raw join data
    });

  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Failed to fetch user', message: error.message });
  }
};
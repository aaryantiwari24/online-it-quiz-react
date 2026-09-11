const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { assertDbReady } = require('../config/db');

// Roles a caller can self-assign through the open public register route.
// Customer-only — closes AUDIT_FIXES.md's F2 finding (option 1: anyone
// posting role: "supplier" here got immediate question-management access,
// with no admin involved at all). 'admin' was already excluded; 'supplier'
// now is too. Supplier accounts are provisioned by an admin instead, via
// POST /api/users (userController.js's createSupplier, restrictTo('admin')).
const PUBLIC_REGISTRATION_ROLES = ['customer'];

// Deliberately loose — checks for "something@something.something" rather
// than attempting full RFC 5322 compliance, which tends to reject valid
// real-world addresses while still letting plenty of nonsense through.
// Good enough to catch obvious garbage ("notanemail") without being a
// false-rejection risk for real users.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// No length rule was specified anywhere in context.md or the README, so
// this is a reasonable default rather than a project requirement — easy
// to change if a different minimum is wanted.
const MIN_PASSWORD_LENGTH = 8;

const SALT_ROUNDS = 10;

/**
 * Signs a JWT carrying `{ id, role }` — the payload shape Phase 2 asks
 * for, and the two fields `restrictTo` needs to make an authorization
 * decision. `protect` (authMiddleware.js) still re-fetches the user from
 * the DB on every request rather than trusting the token's role, so a
 * role change or deleted account takes effect immediately instead of
 * staying valid until the token expires.
 */
const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });

/**
 * Shapes a Mongoose User doc into the plain object that's safe to send
 * to a client — never the password hash, no Mongoose internals.
 */
const toSafeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || null,
});

// @route  POST /api/auth/register
// @access Public
// @body   { name, email, password, role?, phone? }
//
// NOTE on `role`: public self-registration is restricted to
// PUBLIC_REGISTRATION_ROLES (customer only) — neither 'admin' nor
// 'supplier' can be requested through this open route, so an anonymous
// caller can no longer self-escalate to either privileged role. The
// frontend "Student Register" page (Phase 5, per context.md Section 2)
// only ever sends role: 'customer' anyway (or omits it and relies on the
// User model's default), so this doesn't change normal usage. Admin
// accounts are provisioned via seeding (see scripts/seed.js); supplier
// accounts are provisioned by an admin through POST /api/users
// (userController.js's createSupplier) — see that function's own comment
// for why registration stopped allowing self-service supplier signup.
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      const err = new Error('Name, email, and password are required');
      err.status = 400;
      return next(err);
    }

    // bcrypt.hash() throws synchronously on a non-string input (e.g. a
    // number or object slipping through as valid JSON, since !password is
    // a truthiness check, not a type check). Catching that here keeps it
    // a normal validation 400 instead of an uncaught crash surfacing as a
    // generic 500 further down.
    if (typeof password !== 'string') {
      const err = new Error('Password must be a string');
      err.status = 400;
      return next(err);
    }

    // MIN_PASSWORD_LENGTH check — see the constant's comment above for
    // why this exists as a default rather than a specified requirement.
    // Placed after the type check (a length check on a non-string would
    // itself be meaningless) and before anything DB-related.
    if (password.length < MIN_PASSWORD_LENGTH) {
      const err = new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      err.status = 400;
      return next(err);
    }

    if (role && !PUBLIC_REGISTRATION_ROLES.includes(role)) {
      const err = new Error(`Role must be one of: ${PUBLIC_REGISTRATION_ROLES.join(', ')}`);
      err.status = 400;
      return next(err);
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      const err = new Error('A valid email address is required');
      err.status = 400;
      return next(err);
    }

    // All non-DB validation above has already run, so this only trades a
    // slow buffering timeout for a fast, clearly-coded 503 — it doesn't
    // gate the 400s above behind DB availability.
    assertDbReady();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const err = new Error('Email is already registered');
      err.status = 400;
      return next(err);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: role || 'customer',
      phone,
    });

    const token = generateToken(user);

    res.status(201).json({ token, user: toSafeUser(user) });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    } else if (err.code === 11000) {
      // Duplicate-key race: two registrations for the same email landing
      // close together both pass the findOne check above, then the
      // second create() trips Mongo's unique index instead.
      err.message = 'Email is already registered';
      err.status = 400;
    }
    next(err);
  }
};

// @route  POST /api/auth/login
// @access Public
// @body   { email, password }
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const err = new Error('Email and password are required');
      err.status = 400;
      return next(err);
    }

    // Same reasoning as register(): bcrypt.compare() throws on a non-string
    // password, so this needs to be a validation 400, not a crash.
    if (typeof password !== 'string') {
      const err = new Error('Password must be a string');
      err.status = 400;
      return next(err);
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Non-DB validation above has already run — see the comment on the
    // same call in register().
    assertDbReady();

    const user = await User.findOne({ email: normalizedEmail });

    // Same status + message whether the email doesn't exist or the
    // password is wrong, so the response never confirms which emails
    // are registered.
    if (!user) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      return next(err);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      return next(err);
    }

    const token = generateToken(user);

    res.status(200).json({ token, user: toSafeUser(user) });
  } catch (err) {
    next(err);
  }
};

// @route  GET /api/auth/me
// @access Private (any logged-in role)
//
// Started as a Phase 2 placeholder/debug route whose only job was proving
// `protect` works end-to-end (that phase's spec calls this out explicitly,
// describing it as returning `req.user`). Deliberately shaped through the
// same toSafeUser() as register/login rather than returned raw: a raw
// Mongoose doc serializes with `_id`, not `id`, so returning it as-is
// would silently break any Phase 5 code that reads `response.user.id`
// after calling this route (a near-inevitable pattern for rehydrating
// the logged-in user on page load) — which is exactly what happened:
// AuthContext.jsx now calls this on every app load to rehydrate `user`
// from a stored token. Phase 10's cleanup pass confirmed that dependency
// before deciding whether to remove this as leftover scaffolding — it
// isn't leftover, so it stays.
const getMe = (req, res) => {
  res.status(200).json({ user: toSafeUser(req.user) });
};

module.exports = { register, login, getMe };

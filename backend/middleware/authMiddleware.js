const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { assertDbReady } = require('../config/db');

/**
 * Verifies the JWT sent as `Authorization: Bearer <token>`, loads the
 * corresponding user from MongoDB (password field excluded), and attaches
 * it to `req.user` for downstream middleware/controllers — e.g.
 * `restrictTo` below, or `createdBy: req.user.id` when Phase 3 creates a
 * question.
 *
 * Re-fetching the user on every request (rather than trusting the
 * `{ id, role }` already inside the token) costs one extra DB read, but
 * means a deleted account or a changed role takes effect immediately
 * instead of staying valid until the old token expires.
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Not authorized — no token provided');
    err.status = 401;
    return next(err);
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (verifyErr) {
    const err = new Error(
      verifyErr.name === 'TokenExpiredError'
        ? 'Not authorized — token expired'
        : 'Not authorized — invalid token'
    );
    err.status = 401;
    return next(err);
  }

  try {
    // Token verification above is the non-DB check for this handler —
    // same placement reasoning as register()/login() in authController.js.
    //
    // Known, audited trade-off: because every protected route runs through
    // this function first, a DB outage makes assertDbReady() throw 503
    // here before any controller's *own* pre-DB validation (missing field,
    // bad enum, invalid id, etc.) ever runs — so during an outage every
    // protected route replies 503, not the 400 it would give with the DB
    // up. Left as-is on purpose: decoupling protect() from the DB would
    // mean trusting the token's role instead of re-checking it against the
    // current user record, which loses the immediate-revocation property
    // described above. Only matters while the DB is actually down, at
    // which point the API is non-functional either way.
    assertDbReady();

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      const err = new Error('Not authorized — user for this token no longer exists');
      err.status = 401;
      return next(err);
    }

    req.user = user;
    next();
  } catch (dbErr) {
    // An unexpected DB failure, not an auth problem — let the centralized
    // error handler in server.js treat it as the 500 it actually is,
    // instead of mislabeling it as an invalid-token 401.
    next(dbErr);
  }
};

/**
 * Route-guard factory — usage: `restrictTo('admin', 'supplier')`.
 * Always place AFTER `protect` in a route's middleware chain, since this
 * reads `req.user.role`, which only `protect` sets.
 */
const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const err = new Error('You do not have permission to perform this action');
      err.status = 403;
      return next(err);
    }
    next();
  };

module.exports = { protect, restrictTo };

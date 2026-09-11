const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the MONGO_URI defined in backend/.env
 *
 * Phase 0 note: this is intentionally non-fatal on failure. No models
 * exist yet (that's Phase 1), so the API server should still boot and
 * serve /api/health even if a real MongoDB instance hasn't been set up
 * yet. Once later phases actually depend on the database, this can be
 * made to exit the process on failure instead if that's preferred.
 *
 * `bufferCommands: false` + a shorter `serverSelectionTimeoutMS`: with
 * Mongoose's defaults, a query issued while disconnected (e.g. Mongo is
 * down) sits in an internal buffer for up to 10s (bufferTimeoutMS)
 * before failing with a generic MongooseError — a request-side hang, on
 * top of whatever this connection attempt itself is doing. Disabling
 * buffering makes any query fail immediately with a clear
 * "not connected" error instead of silently queuing and waiting.
 * serverSelectionTimeoutMS (default 30s) is shortened to match, so the
 * initial connect() attempt above also fails fast rather than leaving
 * the server looking like it's still starting up for half a minute.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    console.error(
      'Continuing without a database connection. Set a real MONGO_URI in backend/.env once you have a MongoDB instance ready (see README).'
    );
  }
};

module.exports = connectDB;

/**
 * Throws a deliberate 503 if Mongoose isn't in a connected state (readyState
 * 1). Meant to be called from inside a route handler, after that handler's
 * own non-DB validation (missing fields, bad role, invalid token, etc.) has
 * already run, and immediately before its first query — not as router-level
 * middleware, which would gate every route (including ones that don't
 * need the DB at all) behind a database check and break documented
 * DB-independent behavior (e.g. register/login still returning 400 for
 * missing fields even while MongoDB is down).
 *
 * With bufferCommands: false above, a query issued while disconnected would
 * otherwise reject with a generic MongooseError that server.js's error
 * handler can only present as an opaque 500. This turns that into an
 * explicit, correctly-coded "service dependency unavailable" response
 * instead — same idea as bufferCommands: false, just with a clearer error
 * for the handlers that call it.
 */
const assertDbReady = () => {
  if (mongoose.connection.readyState !== 1) {
    const err = new Error('Service temporarily unavailable — database connection is down');
    err.status = 503;
    // Distinguishes this from an unexpected 5xx: server.js's error handler
    // masks 5xx messages by default (they might contain internal detail
    // from a real crash), but this message is deliberately written to be
    // safe to show, so it opts out of masking via this flag.
    err.expose = true;
    throw err;
  }
};

module.exports.assertDbReady = assertDbReady;

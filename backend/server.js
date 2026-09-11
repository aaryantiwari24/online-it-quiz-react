const dotenv = require('dotenv');
dotenv.config();

// --- Fail-fast startup validation ---
// JWT_SECRET has no fallback anywhere it's used (authController's
// generateToken, authMiddleware's protect) — unlike MONGO_URI, which is
// allowed to be missing at boot by Phase 0's design (see config/db.js), a
// missing JWT_SECRET isn't a "run in a degraded mode" situation: jwt.sign()
// throws synchronously on register/login, and jwt.verify() misreports the
// same misconfiguration as an "invalid token" 401 on every protected route.
// Checking it here, before the app does anything else, turns that into one
// clear message at boot instead of a confusing failure on the first real
// request.
if (!process.env.JWT_SECRET) {
  console.error(
    'Missing required environment variable: JWT_SECRET — set it in backend/.env (see .env.example).'
  );
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');

// Attempt DB connection. See config/db.js for why this doesn't crash
// the server if it fails — there's nothing in the DB to use yet at
// Phase 0 (no models), so the API should still come up cleanly.
connectDB();

const app = express();

// --- Security headers ---
// app.disable() is redundant with helmet's own header removal but kept
// explicit since it's an Express one-liner with no downside. helmet()'s
// defaults (CSP, X-Content-Type-Options, frameguard, etc.) are aimed at
// browser-rendered HTML; this API never serves any, so none of them change
// behavior for callers — they just stop being a place for a future
// HTML-serving route (or a misconfigured proxy) to skip hardening it would
// otherwise need. Confirmed this doesn't interfere with the existing CORS
// setup below: helmet's Cross-Origin-Resource-Policy default only blocks
// no-cors cross-origin loads (e.g. a bare <img src>), not the CORS-mode
// requests the frontend's Axios instance makes, which are governed by the
// allow-list below instead.
app.disable('x-powered-by');
app.use(helmet());

// --- CORS ---
// Restrict cross-origin requests to a known allow-list instead of the
// bare `cors()` default, which reflects and permits any Origin. Configure
// production/staging origins via ALLOWED_ORIGINS in backend/.env
// (comma-separated), e.g.:
//   ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
// Falls back to the Vite dev server origin so local development keeps
// working out of the box.
const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : defaultOrigins;

const corsOptions = {
  origin(origin, callback) {
    // No Origin header means it isn't a browser cross-origin request
    // (curl, server-to-server calls, mobile apps, health checks, etc.),
    // so there's nothing for CORS to restrict.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    const err = new Error(`Origin not allowed by CORS: ${origin}`);
    err.status = 403;
    callback(err);
  },
};

app.use(cors(corsOptions));
app.use(express.json());

// express.json() leaves req.body as undefined (not {}) when a request has
// no body or an empty body — e.g. no Content-Type at all, or
// Content-Type: application/json with zero bytes. (Malformed/invalid JSON
// is a different case, already handled by the error handler below via
// entity.parse.failed.) Left alone, that undefined reaches controllers
// like authController's register/login, which destructure straight off
// req.body and throw an uncaught TypeError instead of their intended
// "field is required" 400. Normalizing here means every current and
// future route's existing validation just sees a plain empty object.
app.use((req, res, next) => {
  if (req.body === undefined) {
    req.body = {};
  }
  next();
});

// --- Routes ---
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/questions', require('./routes/questionRoutes'));

app.use('/api/results', require('./routes/resultRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));

// --- Security-fix addition ("no server-side quiz attempt") ---
// /api/quiz-attempts: start-or-resume + submit a server-tracked quiz
// attempt (see routes/quizAttemptRoutes.js and
// SECURITY_FIX_SERVER_SIDE_QUIZ_ATTEMPT.md). This is now the only path
// that can create a Result — resultRoutes.js's own POST '/' was removed
// as part of this same fix, so it's mounted here, right beside /results,
// rather than off with the later Phase 7+ additions below.
app.use('/api/quiz-attempts', require('./routes/quizAttemptRoutes'));

// --- Phase 7 additions ---
// /api/users: admin-only supplier list/removal, backing "Manage
// Suppliers" (see routes/userRoutes.js). /api/stats: public site-wide
// aggregate counts, backing the admin dashboard now and reusable by
// Phase 9's homepage later (see routes/statsRoutes.js).
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));

// --- Phase 10 addition ---
// /api/faqs: public read, admin-only write — backs the new /faq page and
// admin's "Manage FAQs" (see routes/faqRoutes.js). FAQ.js has existed
// since Phase 1 with no route ever mounted for it until now.
app.use('/api/faqs', require('./routes/faqRoutes'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// --- 404 handler ---
// Anything that didn't match a route above gets a controlled JSON
// response instead of Express's default HTML "Cannot GET /..." page.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// --- Centralized error handler ---
// Defined last, with 4 arguments, so Express treats it as error-handling
// middleware. Catches malformed JSON bodies (thrown by express.json()),
// CORS rejections from above, and anything else passed to next(err) in
// later phases. Always responds with controlled JSON — never Express's
// default HTML error page, which includes a full stack trace with
// absolute filesystem paths.
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const isMalformedJson = err.type === 'entity.parse.failed';
  const status = isMalformedJson ? 400 : err.status || err.statusCode || 500;
  // Masking is about whether a message might leak internal detail from an
  // unexpected crash, not just the status number — a deliberately thrown
  // 5xx with a pre-written safe message (marked err.expose = true, e.g.
  // assertDbReady's 503) should still reach the client as written.
  const shouldMaskMessage = status >= 500 && !err.expose;

  // Full detail always goes to the server log...
  console.error(err.stack || err);

  // ...but the client only ever gets a controlled message. A stack trace
  // is only ever added when NODE_ENV is explicitly 'development' — not
  // "whenever it isn't 'production'". That's deliberate: an unconfigured
  // or misconfigured deploy (NODE_ENV left unset, which is common) must
  // fail safe with no stack trace, rather than leak one by default. Local
  // dev gets the trace automatically via nodemon.json, which sets
  // NODE_ENV=development for `npm run dev` without touching this file.
  res.status(status).json({
    error: isMalformedJson
      ? 'Malformed JSON in request body'
      : shouldMaskMessage
        ? 'Internal server error'
        : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

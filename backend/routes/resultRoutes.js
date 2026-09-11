const express = require('express');
const { getMyResults, getResultById, getAllResults } = require('../controllers/resultController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Admin-only, every customer's results — see getAllResults' own comment
// in resultController.js. "/" and "/:id" are different-shaped paths (zero
// segments vs. one), so this doesn't have the same registration-order
// sensitivity "/me" below has against "/:id".
router.get('/', protect, restrictTo('admin'), getAllResults);

// NOTE: there is no longer a POST '/' here. A Result can no longer be
// created directly from categoryId/difficulty/answers in the request
// body — see the "no server-side quiz attempt" fix write-up
// (SECURITY_FIX_SERVER_SIDE_QUIZ_ATTEMPT.md) for the finding this closes.
// A Result is now only ever created as the side effect of grading a real,
// server-issued QuizAttempt: POST /api/quiz-attempts to start or resume
// one, then POST /api/quiz-attempts/:id/submit to submit it — see
// quizAttemptRoutes.js and quizAttemptController.js. This resource stays
// read-only from here on: something a QuizAttempt submission produces,
// the same way certificateController.js's Certificate is something a
// passing Result produces.

// Static "/me" must be registered before the dynamic "/:id" below, or
// Express would match "/me" as { id: 'me' } and getResultById would 400 on
// it as an invalid result id — this is the route-order issue
// coding-phases.md's handoff log referenced from the previous session.
router.get('/me', protect, getMyResults);
router.get('/:id', protect, getResultById);

module.exports = router;

const express = require('express');
const { startOrResumeAttempt, submitAttempt } = require('../controllers/quizAttemptController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Start (or resume an already-active) quiz attempt — the replacement for
// the old GET /api/questions/random/:categoryId as far as the
// customer-facing quiz-taking flow is concerned. Any logged-in role, same
// as getRandomQuestions always was — see startOrResumeAttempt's own
// comment in quizAttemptController.js for why that's still the right
// call here, re-derived rather than assumed.
router.post('/', protect, startOrResumeAttempt);

// Submit a quiz attempt for grading — the replacement for the old
// POST /api/results. restrictTo('customer'), same reasoning as
// createResult's former restriction (see AUDIT_FIXES.md's addendum):
// this is what actually persists a graded, certificate-eligible Result.
router.post('/:id/submit', protect, restrictTo('customer'), submitAttempt);

module.exports = router;

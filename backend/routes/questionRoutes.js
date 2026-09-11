const express = require('express');
const {
  getQuestionsByCategory,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getRandomQuestions,
} = require('../controllers/questionController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Management view — full question docs, correct_answer included.
router.get('/category/:categoryId', protect, restrictTo('admin', 'supplier'), getQuestionsByCategory);

// General-purpose "preview N random questions" read, correct_answer
// stripped server-side — no longer what the quiz-taking screen actually
// uses (that's POST /api/quiz-attempts as of the "no server-side quiz
// attempt" security fix; see getRandomQuestions' own updated comment in
// questionController.js for the full explanation of why this stayed).
// Any logged-in role can call it; see that same comment for why this
// isn't restrictTo('customer').
router.get('/random/:categoryId', protect, getRandomQuestions);

router.post('/', protect, restrictTo('admin', 'supplier'), createQuestion);
router.put('/:id', protect, restrictTo('admin', 'supplier'), updateQuestion);
router.delete('/:id', protect, restrictTo('admin', 'supplier'), deleteQuestion);

module.exports = router;

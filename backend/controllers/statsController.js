const Question = require('../models/Question');
const Result = require('../models/Result');
const { assertDbReady } = require('../config/db');

// Fixed at 3 (Easy/Medium/Hard — see Question.js's difficulty enum)
// rather than computed from the DB. This mirrors the homepage's
// "Structured Difficulty" section (context.md Section 2), which always
// shows exactly 3 tier cards regardless of how many questions exist in
// each — it's a statement about the site's structure, not a count of
// anything that changes.
const DIFFICULTY_TIER_COUNT = 3;

// @route  GET /api/stats
// @access Public — same reasoning as categoryController.js's
// getCategories: context.md Section 2's homepage stats strip ("Live
// Questions, Quizzes Taken, Difficulty Tiers, Certificates Earned") is
// public marketing copy, read before login.
//
// New in Phase 7, one phase earlier than coding-phases.md's Phase 9
// section originally called for ("a small new GET /api/stats endpoint
// if one doesn't exist yet") — added now to back the admin dashboard's
// reuse of this same stat style. Phase 9 can call this directly instead
// of duplicating the aggregation.
//
// "Certificates Earned" is counted as passed Results, not actual
// Certificate documents — certificateController.js only creates a
// Certificate row lazily, the first time a customer opens their
// certificate page, so the real collection would under-count students
// who passed but never clicked through. A passed Result is the more
// honest "earned" the stat name is going for.
const getStats = async (req, res, next) => {
  try {
    assertDbReady();

    const [liveQuestions, quizzesTaken, certificatesEarned] = await Promise.all([
      Question.countDocuments(),
      Result.countDocuments(),
      Result.countDocuments({ status: 'Pass' }),
    ]);

    res.status(200).json({
      liveQuestions,
      quizzesTaken,
      difficultyTiers: DIFFICULTY_TIER_COUNT,
      certificatesEarned,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats };

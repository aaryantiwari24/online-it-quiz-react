const mongoose = require('mongoose');
const Result = require('../models/Result');

const { assertDbReady } = require('../config/db');

// See the identical helper in categoryController.js/questionController.js
// for why this is kept file-local instead of shared.
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Confirmed in context.md Section 7 ("60% is the pass threshold") and the
// reference video's certificate copy ("Pass the 60% threshold...").
// Treated as inclusive — exactly 60% passes.
const PASS_THRESHOLD = 60;

/**
 * Pure grading function — deliberately decoupled from req/res/DB so it can
 * be unit-tested on its own (per coding-phases.md's account of how the
 * Phase 4 grading formula was validated previously). Grades against the
 * Question documents actually fetched from the DB, never a client-supplied
 * correct answer.
 *
 * Still lives here (not quizAttemptController.js) even though createResult
 * — its original caller — is gone: grading is fundamentally about how a
 * Result's score/percentage/status are derived, which is this file's
 * concern, not the quiz-attempt lifecycle's. quizAttemptController.js's
 * submitAttempt imports this rather than duplicating it.
 */
const gradeQuiz = (questions, submittedAnswers) => {
  const questionById = new Map(questions.map((q) => [q._id.toString(), q]));

  const gradedAnswers = submittedAnswers.map(({ questionId, selectedOption }) => {
    const question = questionById.get(String(questionId));
    const normalizedSelected = selectedOption ?? null;
    const isCorrect = Boolean(
      question && normalizedSelected !== null && normalizedSelected === question.correct_answer
    );
    return { question: questionId, selectedOption: normalizedSelected, isCorrect };
  });

  const totalQuestions = gradedAnswers.length;
  const score = gradedAnswers.filter((a) => a.isCorrect).length;
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const status = percentage >= PASS_THRESHOLD ? 'Pass' : 'Fail';

  return { gradedAnswers, score, totalQuestions, percentage, status };
};

// @route  GET /api/results/me
// @access Private (any logged-in role — scoped to req.user.id, so there's
// nothing role-sensitive to restrict)
const getMyResults = async (req, res, next) => {
  try {
    assertDbReady();

    const results = await Result.find({ customer: req.user.id })
      .populate('category', 'category_name')
      .sort({ attemptDate: -1 });

    res.status(200).json({ results, count: results.length });
  } catch (err) {
    next(err);
  }
};

// @route  GET /api/results
// @access Private (admin only)
// @query  ?status=Pass|Fail, ?category=<categoryId> (both optional)
//
// Admin-only, site-wide sibling of getMyResults — backs Phase 7's "All
// Results" page. Deliberately left out of Phase 4 and built here instead;
// see this exact function's absence called out in coding-phases.md's
// Phase 4 section ("all customer-protected... except maybe an admin 'view
// all results' variant if you want it now (fine to defer to Phase 7)").
const getAllResults = async (req, res, next) => {
  try {
    const { status, category } = req.query;

    if (status !== undefined && !['Pass', 'Fail'].includes(status)) {
      const err = new Error('status must be one of: Pass, Fail');
      err.status = 400;
      return next(err);
    }

    if (category !== undefined && !isValidObjectId(category)) {
      const err = new Error('Invalid category id');
      err.status = 400;
      return next(err);
    }

    assertDbReady();

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const results = await Result.find(filter)
      .populate('customer', 'name email')
      .populate('category', 'category_name')
      .sort({ attemptDate: -1 });

    res.status(200).json({ results, count: results.length });
  } catch (err) {
    next(err);
  }
};

/**
 * Customers (and suppliers, treated the same here) may only view their own
 * result; admins may view any — same owner-or-admin shape as
 * assertCanModifyQuestion in questionController.js. Flagged assumption, not
 * a verified behavior: this wasn't one of coding-phases.md's recorded Phase
 * 4 cases (there was no DB in this environment to reach one with).
 */
const assertCanViewResult = (user, resultDoc) => {
  if (user.role !== 'admin' && resultDoc.customer.toString() !== user.id) {
    const err = new Error('You do not have permission to view this result');
    err.status = 403;
    return err;
  }
  return null;
};

// @route  GET /api/results/:id
// @access Private (owner or admin — see assertCanViewResult)
const getResultById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      const err = new Error('Invalid result id');
      err.status = 400;
      return next(err);
    }

    assertDbReady();

    const result = await Result.findById(id)
      .populate('category', 'category_name')
      .populate('answers.question', 'question option_a option_b option_c option_d correct_answer')
      // FLAGGED ADDITION — closes finding #5. Not consumed by
      // Results.jsx today (no UI change was asked for or made here), but
      // now that every Result traces back to a real QuizAttempt, this is
      // a free, low-cost way for this response to actually carry that
      // trustworthy record (started/expired/submitted timestamps, and
      // the attempt's own status) forward to anywhere that later wants
      // it — an admin audit view, for instance — rather than making that
      // hypothetical future caller re-derive it. Selecting only these
      // four fields keeps this populate cheap and keeps `customer` off
      // of it, which would be redundant with this Result's own `customer`.
      .populate('quizAttempt', 'startedAt expiresAt submittedAt status');

    if (!result) {
      const err = new Error('Result not found');
      err.status = 404;
      return next(err);
    }

    const permissionErr = assertCanViewResult(req.user, result);
    if (permissionErr) return next(permissionErr);

    res.status(200).json({ result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyResults,
  getResultById,
  getAllResults,
  gradeQuiz,
  // Exported so certificateController.js's re-verification check (see its
  // own comment on why it exists) uses this exact same 60%-inclusive rule,
  // rather than a second hardcoded `60` that could silently drift from
  // this one if either ever changed. gradeQuiz already closes over this
  // constant for the normal grading path (submitAttempt); this export
  // covers the one other place that needs the identical rule applied to
  // an already-stored Result's answers instead of freshly-graded ones.
  PASS_THRESHOLD,
};

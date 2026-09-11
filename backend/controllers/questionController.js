const mongoose = require('mongoose');
const Question = require('../models/Question');
const Category = require('../models/Category');
const { assertDbReady } = require('../config/db');

// See the identical helper in categoryController.js for why this is kept
// file-local instead of shared.
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const VALID_ANSWER_KEYS = ['A', 'B', 'C', 'D'];

// Fixed at 10 to match the confirmed quiz length from context.md ("10
// questions per quiz attempt, fixed regardless of category size" —
// Section 7, corroborated by the reference video's "QUESTION X OF 10"
// copy in Section 2). Kept as a named constant instead of a client-
// supplied `count` query param so Phase 6's quiz screen — hardcoded
// around a 10-question flow and a 5-per-row Question Map — can't be
// handed a differently-sized quiz by a stray request.
const QUESTIONS_PER_QUIZ = 10;

/**
 * Validates correct_answer/difficulty against their enums when present.
 * Shared by createQuestion (both required) and updateQuestion (both
 * optional) — only checks fields that were actually passed in, so
 * callers still do their own presence checks first. Returns an Error
 * instead of throwing so callers can `return next(err)` it, matching the
 * rest of this codebase's validation style (see authController.js).
 */
const validateAnswerFields = ({ correct_answer, difficulty }) => {
  if (correct_answer !== undefined && !VALID_ANSWER_KEYS.includes(correct_answer)) {
    const err = new Error(`correct_answer must be one of: ${VALID_ANSWER_KEYS.join(', ')}`);
    err.status = 400;
    return err;
  }
  if (difficulty !== undefined && !VALID_DIFFICULTIES.includes(difficulty)) {
    const err = new Error(`difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`);
    err.status = 400;
    return err;
  }
  return null;
};

// @route  GET /api/questions/category/:categoryId
// @access Private (admin, supplier)
// @query  ?difficulty=Easy|Medium|Hard  (optional filter)
//
// Full question documents, correct_answer included — this is the
// management-view endpoint (Manage Questions in Phase 7, My Questions in
// Phase 8), not the customer-facing one; getRandomQuestions below is the
// one that hides the answer. Deliberately not creator-scoped: any admin
// or supplier can see every question in a category (useful context before
// adding a new one, and matches Admin's "oversee/approve questions" role
// from context.md Section 4). Only updateQuestion/deleteQuestion below
// restrict suppliers to their own questions — this is read-only.
const getQuestionsByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { difficulty } = req.query;

    if (!isValidObjectId(categoryId)) {
      const err = new Error('Invalid category id');
      err.status = 400;
      return next(err);
    }

    if (difficulty !== undefined && !VALID_DIFFICULTIES.includes(difficulty)) {
      const err = new Error(`difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`);
      err.status = 400;
      return next(err);
    }

    assertDbReady();

    const category = await Category.findById(categoryId);
    if (!category) {
      const err = new Error('Category not found');
      err.status = 404;
      return next(err);
    }

    const filter = { category: categoryId };
    if (difficulty) {
      filter.difficulty = difficulty;
    }

    const questions = await Question.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({ questions });
  } catch (err) {
    next(err);
  }
};

// @route  POST /api/questions
// @access Private (admin, supplier)
// @body   { category, question, option_a, option_b, option_c, option_d, correct_answer, difficulty }
const createQuestion = async (req, res, next) => {
  try {
    const { question, option_a, option_b, option_c, option_d, correct_answer, difficulty } = req.body;
    const category = req.body.category !== undefined ? String(req.body.category).trim() : req.body.category;

    if (
      !category ||
      !question ||
      !option_a ||
      !option_b ||
      !option_c ||
      !option_d ||
      !correct_answer ||
      !difficulty
    ) {
      const err = new Error(
        'category, question, option_a, option_b, option_c, option_d, correct_answer, and difficulty are all required'
      );
      err.status = 400;
      return next(err);
    }

    if (!isValidObjectId(category)) {
      const err = new Error('Invalid category id');
      err.status = 400;
      return next(err);
    }

    const answerErr = validateAnswerFields({ correct_answer, difficulty });
    if (answerErr) return next(answerErr);

    assertDbReady();

    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      const err = new Error('Category not found');
      err.status = 404;
      return next(err);
    }

    const newQuestion = await Question.create({
      category,
      createdBy: req.user.id, // per coding-phases.md Phase 3
      question: String(question).trim(),
      option_a: String(option_a).trim(),
      option_b: String(option_b).trim(),
      option_c: String(option_c).trim(),
      option_d: String(option_d).trim(),
      correct_answer,
      difficulty,
    });

    res.status(201).json({ question: newQuestion });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    next(err);
  }
};

/**
 * Admins may modify any question; suppliers only ones they created. Not
 * spelled out explicitly in coding-phases.md's Phase 3 section (which
 * just says restrictTo('admin', 'supplier') for update/delete), but
 * Phase 8 describes "My Questions... table of questions this supplier
 * created, edit/delete" — implying suppliers manage their own, not each
 * other's. Flagging this the same way authController.js flags its own
 * non-locked assumptions (see e.g. its MIN_PASSWORD_LENGTH comment): a
 * reasonable default, easy to loosen later if suppliers should in fact
 * be able to edit any question.
 */
const assertCanModifyQuestion = (user, questionDoc) => {
  if (user.role === 'supplier' && questionDoc.createdBy.toString() !== user.id) {
    const err = new Error('You can only modify questions you created');
    err.status = 403;
    return err;
  }
  return null;
};

// @route  PUT /api/questions/:id
// @access Private (admin, supplier — supplier limited to their own questions)
// @body   any subset of { category, question, option_a..d, correct_answer, difficulty }
const updateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      const err = new Error('Invalid question id');
      err.status = 400;
      return next(err);
    }

    const { question, option_a, option_b, option_c, option_d, correct_answer, difficulty } = req.body;
    const category = req.body.category !== undefined ? String(req.body.category).trim() : undefined;

    const answerErr = validateAnswerFields({ correct_answer, difficulty });
    if (answerErr) return next(answerErr);

    if (category !== undefined && !isValidObjectId(category)) {
      const err = new Error('Invalid category id');
      err.status = 400;
      return next(err);
    }

    assertDbReady();

    const existing = await Question.findById(id);
    if (!existing) {
      const err = new Error('Question not found');
      err.status = 404;
      return next(err);
    }

    const permissionErr = assertCanModifyQuestion(req.user, existing);
    if (permissionErr) return next(permissionErr);

    if (category !== undefined) {
      const categoryDoc = await Category.findById(category);
      if (!categoryDoc) {
        const err = new Error('Category not found');
        err.status = 404;
        return next(err);
      }
    }

    const updates = {};
    if (category !== undefined) updates.category = category;
    if (question !== undefined) updates.question = String(question).trim();
    if (option_a !== undefined) updates.option_a = String(option_a).trim();
    if (option_b !== undefined) updates.option_b = String(option_b).trim();
    if (option_c !== undefined) updates.option_c = String(option_c).trim();
    if (option_d !== undefined) updates.option_d = String(option_d).trim();
    if (correct_answer !== undefined) updates.correct_answer = correct_answer;
    if (difficulty !== undefined) updates.difficulty = difficulty;

    if (Object.keys(updates).length === 0) {
      const err = new Error('Provide at least one field to update');
      err.status = 400;
      return next(err);
    }

    const updated = await Question.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ question: updated });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    next(err);
  }
};

// @route  DELETE /api/questions/:id
// @access Private (admin, supplier — supplier limited to their own questions)
const deleteQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      const err = new Error('Invalid question id');
      err.status = 400;
      return next(err);
    }

    assertDbReady();

    const existing = await Question.findById(id);
    if (!existing) {
      const err = new Error('Question not found');
      err.status = 404;
      return next(err);
    }

    const permissionErr = assertCanModifyQuestion(req.user, existing);
    if (permissionErr) return next(permissionErr);

    await existing.deleteOne();

    res.status(200).json({ message: 'Question deleted', id });
  } catch (err) {
    next(err);
  }
};

// @route  GET /api/questions/random/:categoryId
// @access Private (any logged-in role)
// @query  ?difficulty=Easy|Medium|Hard  (required)
//
// UPDATED — no longer what the quiz-taking screen calls. Originally *the*
// load-bearing endpoint coding-phases.md called out by name for Phase 6,
// but the "no server-side quiz attempt" security fix
// (SECURITY_FIX_SERVER_SIDE_QUIZ_ATTEMPT.md) replaced that role with
// POST /api/quiz-attempts (quizAttemptController.js's
// startOrResumeAttempt), which samples a question set the exact same way
// (see that function's own comment — the aggregation below was copied
// there, not reinvented) but also fixes it server-side against a real
// QuizAttempt record instead of handing it to the browser with nothing
// to hold it accountable to. This endpoint is left in place as a
// general-purpose "preview N random questions for a category+difficulty,
// answers hidden" read: still fully safe (still never includes
// correct_answer, still creates no record of any kind), just no longer
// wired to anything that can turn into a graded Result. Flagged here
// rather than silently left as unreferenced dead code, per Phase 10's own
// "remove leftover placeholder routes... if it turns out to be unused"
// item — this one isn't unused-by-oversight, it's kept on purpose as a
// harmless utility, so it stays.
//
// Uses MongoDB's $sample aggregation stage rather than fetching every
// matching question and shuffling in JS: it's the right tool for "N
// random documents" generally, and it's an honest place to demonstrate
// the aggregation pipeline the AWD syllabus's Unit 1 calls for
// (context.md Section 1), rather than bolting one on somewhere unrelated
// just to cover it.
//
// Deliberately not restrictTo('customer') — nothing in the response is
// customer-sensitive (the whole point of this endpoint is that it's
// already safe to show anyone who's logged in), and letting admin/
// supplier preview a quiz the way a customer would see it is reasonable
// to allow rather than block.
//
// Gracefully returns fewer than QUESTIONS_PER_QUIZ if the pool is
// smaller — current seed data has PHP/Medium and PHP/Hard sitting at
// just 1 question each — rather than erroring. Only a genuine
// zero-questions match is treated as an error, since a quiz with 0
// questions can't be taken at all.
const getRandomQuestions = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { difficulty } = req.query;

    if (!isValidObjectId(categoryId)) {
      const err = new Error('Invalid category id');
      err.status = 400;
      return next(err);
    }

    if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty)) {
      const err = new Error(
        `difficulty is required and must be one of: ${VALID_DIFFICULTIES.join(', ')}`
      );
      err.status = 400;
      return next(err);
    }

    assertDbReady();

    const category = await Category.findById(categoryId);
    if (!category) {
      const err = new Error('Category not found');
      err.status = 404;
      return next(err);
    }

    const questions = await Question.aggregate([
      {
        $match: {
          category: new mongoose.Types.ObjectId(categoryId),
          difficulty,
        },
      },
      { $sample: { size: QUESTIONS_PER_QUIZ } },
      { $project: { correct_answer: 0 } },
    ]);

    if (questions.length === 0) {
      const err = new Error(
        `No ${difficulty} questions found for category "${category.category_name}" yet`
      );
      err.status = 404;
      return next(err);
    }

    res.status(200).json({ questions, count: questions.length });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getQuestionsByCategory,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getRandomQuestions,
};

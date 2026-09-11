const mongoose = require('mongoose');
const Question = require('../models/Question');
const Category = require('../models/Category');
const { assertDbReady } = require('../config/db');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const VALID_ANSWER_KEYS = ['A', 'B', 'C', 'D'];
const QUESTIONS_PER_QUIZ = 10;

const validateAnswerFields = ({ correct_answer, difficulty }) => {
  if (
    correct_answer !== undefined &&
    !VALID_ANSWER_KEYS.includes(correct_answer)
  ) {
    const err = new Error(
      `correct_answer must be one of: ${VALID_ANSWER_KEYS.join(', ')}`
    );
    err.status = 400;
    return err;
  }

  if (
    difficulty !== undefined &&
    !VALID_DIFFICULTIES.includes(difficulty)
  ) {
    const err = new Error(
      `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`
    );
    err.status = 400;
    return err;
  }

  return null;
};

/*
 * PHP-compatible duplicate check.
 *
 * PHP blocks an exact duplicate across ALL suppliers using:
 * category + difficulty + question + option A/B/C/D + correct answer
 */
const findDuplicateQuestion = async ({
  category,
  difficulty,
  question,
  option_a,
  option_b,
  option_c,
  option_d,
  correct_answer,
  excludeId,
}) => {
  const filter = {
    category,
    difficulty,
    question,
    option_a,
    option_b,
    option_c,
    option_d,
    correct_answer,
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  return Question.findOne(filter).select('_id');
};

// @route GET /api/questions/category/:categoryId
// @access Private (admin, supplier)
// @query ?difficulty=Easy|Medium|Hard
const getQuestionsByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { difficulty } = req.query;

    if (!isValidObjectId(categoryId)) {
      const err = new Error('Invalid category id');
      err.status = 400;
      return next(err);
    }

    if (
      difficulty !== undefined &&
      !VALID_DIFFICULTIES.includes(difficulty)
    ) {
      const err = new Error(
        `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`
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

    const filter = {
      category: categoryId,
    };

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

// @route POST /api/questions
// @access Private (admin, supplier)
const createQuestion = async (req, res, next) => {
  try {
    const {
      question,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer,
      difficulty,
    } = req.body;

    const category =
      req.body.category !== undefined
        ? String(req.body.category).trim()
        : req.body.category;

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

    const answerErr = validateAnswerFields({
      correct_answer,
      difficulty,
    });

    if (answerErr) {
      return next(answerErr);
    }

    assertDbReady();

    const categoryDoc = await Category.findById(category);

    if (!categoryDoc) {
      const err = new Error('Category not found');
      err.status = 404;
      return next(err);
    }

    const normalizedQuestion = String(question).trim();
    const normalizedOptionA = String(option_a).trim();
    const normalizedOptionB = String(option_b).trim();
    const normalizedOptionC = String(option_c).trim();
    const normalizedOptionD = String(option_d).trim();

    /*
     * PHP:
     * SELECT question_id
     * FROM question
     * WHERE category_id = ?
     * AND difficulty = ?
     * AND question = ?
     * AND option_a = ?
     * AND option_b = ?
     * AND option_c = ?
     * AND option_d = ?
     * AND correct_answer = ?
     */
    const duplicate = await findDuplicateQuestion({
      category,
      difficulty,
      question: normalizedQuestion,
      option_a: normalizedOptionA,
      option_b: normalizedOptionB,
      option_c: normalizedOptionC,
      option_d: normalizedOptionD,
      correct_answer,
    });

    if (duplicate) {
      const err = new Error(
        'This question already exists in this category and difficulty.'
      );
      err.status = 400;
      return next(err);
    }

    const newQuestion = await Question.create({
      category,
      createdBy: req.user.id,
      question: normalizedQuestion,
      option_a: normalizedOptionA,
      option_b: normalizedOptionB,
      option_c: normalizedOptionC,
      option_d: normalizedOptionD,
      correct_answer,
      difficulty,
    });

    res.status(201).json({
      question: newQuestion,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    }

    next(err);
  }
};

const assertCanModifyQuestion = (user, questionDoc) => {
  if (
    user.role === 'supplier' &&
    questionDoc.createdBy.toString() !== user.id
  ) {
    const err = new Error(
      'You can only modify questions you created'
    );

    err.status = 403;
    return err;
  }

  return null;
};

// @route PUT /api/questions/:id
// @access Private (admin, supplier)
const updateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      const err = new Error('Invalid question id');
      err.status = 400;
      return next(err);
    }

    const {
      question,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer,
      difficulty,
    } = req.body;

    const category =
      req.body.category !== undefined
        ? String(req.body.category).trim()
        : undefined;

    const answerErr = validateAnswerFields({
      correct_answer,
      difficulty,
    });

    if (answerErr) {
      return next(answerErr);
    }

    if (
      category !== undefined &&
      !isValidObjectId(category)
    ) {
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

    const permissionErr = assertCanModifyQuestion(
      req.user,
      existing
    );

    if (permissionErr) {
      return next(permissionErr);
    }

    if (category !== undefined) {
      const categoryDoc = await Category.findById(category);

      if (!categoryDoc) {
        const err = new Error('Category not found');
        err.status = 404;
        return next(err);
      }
    }

    /*
     * Build the final values after applying the update.
     *
     * This is important because PHP checks the complete resulting
     * question, not just whichever fields happened to be submitted.
     */
    const finalCategory =
      category !== undefined
        ? category
        : existing.category.toString();

    const finalDifficulty =
      difficulty !== undefined
        ? difficulty
        : existing.difficulty;

    const finalQuestion =
      question !== undefined
        ? String(question).trim()
        : existing.question;

    const finalOptionA =
      option_a !== undefined
        ? String(option_a).trim()
        : existing.option_a;

    const finalOptionB =
      option_b !== undefined
        ? String(option_b).trim()
        : existing.option_b;

    const finalOptionC =
      option_c !== undefined
        ? String(option_c).trim()
        : existing.option_c;

    const finalOptionD =
      option_d !== undefined
        ? String(option_d).trim()
        : existing.option_d;

    const finalCorrectAnswer =
      correct_answer !== undefined
        ? correct_answer
        : existing.correct_answer;

    /*
     * PHP excludes the current question ID from the duplicate check.
     */
    const duplicate = await findDuplicateQuestion({
      category: finalCategory,
      difficulty: finalDifficulty,
      question: finalQuestion,
      option_a: finalOptionA,
      option_b: finalOptionB,
      option_c: finalOptionC,
      option_d: finalOptionD,
      correct_answer: finalCorrectAnswer,
      excludeId: id,
    });

    if (duplicate) {
      const err = new Error(
        'This question already exists in this category and difficulty.'
      );
      err.status = 400;
      return next(err);
    }

    const updates = {};

    if (category !== undefined) {
      updates.category = category;
    }

    if (question !== undefined) {
      updates.question = String(question).trim();
    }

    if (option_a !== undefined) {
      updates.option_a = String(option_a).trim();
    }

    if (option_b !== undefined) {
      updates.option_b = String(option_b).trim();
    }

    if (option_c !== undefined) {
      updates.option_c = String(option_c).trim();
    }

    if (option_d !== undefined) {
      updates.option_d = String(option_d).trim();
    }

    if (correct_answer !== undefined) {
      updates.correct_answer = correct_answer;
    }

    if (difficulty !== undefined) {
      updates.difficulty = difficulty;
    }

    if (Object.keys(updates).length === 0) {
      const err = new Error(
        'Provide at least one field to update'
      );
      err.status = 400;
      return next(err);
    }

    const updated = await Question.findByIdAndUpdate(
      id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      question: updated,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    }

    next(err);
  }
};

// @route DELETE /api/questions/:id
// @access Private (admin, supplier)
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

    const permissionErr = assertCanModifyQuestion(
      req.user,
      existing
    );

    if (permissionErr) {
      return next(permissionErr);
    }

    await existing.deleteOne();

    res.status(200).json({
      message: 'Question deleted',
      id,
    });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/questions/random/:categoryId
// @access Private
// @query ?difficulty=Easy|Medium|Hard
const getRandomQuestions = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { difficulty } = req.query;

    if (!isValidObjectId(categoryId)) {
      const err = new Error('Invalid category id');
      err.status = 400;
      return next(err);
    }

    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      const err = new Error(
        `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`
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
      {
        $sample: {
          size: QUESTIONS_PER_QUIZ,
        },
      },
      {
        $project: {
          question: 1,
          option_a: 1,
          option_b: 1,
          option_c: 1,
          option_d: 1,
          difficulty: 1,
          category: 1,
        },
      },
    ]);

    if (questions.length === 0) {
      const err = new Error(
        'No questions found for this category and difficulty'
      );
      err.status = 404;
      return next(err);
    }

    res.status(200).json({
      questions,
    });
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
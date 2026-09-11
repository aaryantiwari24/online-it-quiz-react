const mongoose = require('mongoose');
const FAQ = require('../models/FAQ');
const { assertDbReady } = require('../config/db');

// See the identical helper in categoryController.js/questionController.js
// for why this is kept file-local instead of shared.
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// @route  GET /api/faqs
// @access Public — the /faq page (Phase 10) reads this without being
// logged in, same reasoning as getCategories in categoryController.js.
//
// FAQ.js (Phase 1) has no `order` field and no `timestamps` option, so
// there's nothing to sort by that expresses "the order an admin intended".
// Sorting by _id ascending is the closest available stand-in for
// insertion order (Mongo ObjectIds are monotonically increasing per
// process) without changing the Phase 1 schema this late — ties every
// list render (this endpoint, ManageFAQs.jsx's table, FAQ.jsx's list) to
// the same stable order instead of leaving it to find()'s unspecified
// natural order.
const getFAQs = async (req, res, next) => {
  try {
    assertDbReady();
    const faqs = await FAQ.find().sort({ _id: 1 });
    res.status(200).json({ faqs, count: faqs.length });
  } catch (err) {
    next(err);
  }
};

// @route  POST /api/faqs
// @access Private (admin only)
// @body   { question, answer }
const createFAQ = async (req, res, next) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      const err = new Error('question and answer are required');
      err.status = 400;
      return next(err);
    }

    const normalizedQuestion = String(question).trim();
    const normalizedAnswer = String(answer).trim();

    if (!normalizedQuestion || !normalizedAnswer) {
      const err = new Error('question and answer cannot be blank');
      err.status = 400;
      return next(err);
    }

    // Non-DB validation above has already run — see the equivalent comment
    // on assertDbReady() in authController.register().
    assertDbReady();

    const faq = await FAQ.create({
      question: normalizedQuestion,
      answer: normalizedAnswer,
    });

    res.status(201).json({ faq });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    next(err);
  }
};

// @route  PUT /api/faqs/:id
// @access Private (admin only)
// @body   { question?, answer? } — partial update, at least one required
const updateFAQ = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      const err = new Error('Invalid FAQ id');
      err.status = 400;
      return next(err);
    }

    const { question, answer } = req.body;
    const updates = {};

    if (question !== undefined) {
      const normalizedQuestion = String(question).trim();
      if (!normalizedQuestion) {
        const err = new Error('question cannot be blank');
        err.status = 400;
        return next(err);
      }
      updates.question = normalizedQuestion;
    }

    if (answer !== undefined) {
      const normalizedAnswer = String(answer).trim();
      if (!normalizedAnswer) {
        const err = new Error('answer cannot be blank');
        err.status = 400;
        return next(err);
      }
      updates.answer = normalizedAnswer;
    }

    if (Object.keys(updates).length === 0) {
      const err = new Error('Provide at least one of question or answer to update');
      err.status = 400;
      return next(err);
    }

    assertDbReady();

    const faq = await FAQ.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!faq) {
      const err = new Error('FAQ not found');
      err.status = 404;
      return next(err);
    }

    res.status(200).json({ faq });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    next(err);
  }
};

// @route  DELETE /api/faqs/:id
// @access Private (admin only)
//
// No reference-blocking check like deleteCategory's Question count —
// nothing else in the schema (backend/models/*.js) holds a ref to FAQ, so
// there's no dangling-reference risk to guard against on removal.
const deleteFAQ = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      const err = new Error('Invalid FAQ id');
      err.status = 400;
      return next(err);
    }

    assertDbReady();

    const faq = await FAQ.findById(id);
    if (!faq) {
      const err = new Error('FAQ not found');
      err.status = 404;
      return next(err);
    }

    await faq.deleteOne();

    res.status(200).json({ message: 'FAQ deleted', id });
  } catch (err) {
    next(err);
  }
};

module.exports = { getFAQs, createFAQ, updateFAQ, deleteFAQ };

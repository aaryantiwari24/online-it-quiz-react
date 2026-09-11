const mongoose = require('mongoose');
const Category = require('../models/Category');
const Question = require('../models/Question');
const { assertDbReady } = require('../config/db');

// Small local helper, kept file-scoped rather than pulled into a shared
// /utils module — same reasoning as authController.js keeping toSafeUser()
// and generateToken() local to itself instead of a shared file.
// questionController.js defines its own copy of this too; it's one line,
// and duplicating it avoids introducing a folder that isn't part of the
// structure context.md Section 6 laid out.
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// @route  GET /api/categories
// @access Public
//
// No login required — the homepage's "Explore IT Categories" section and
// the customer "Available Quizzes" page (context.md Section 2) both need
// this before/without a logged-in user.
const getCategories = async (req, res, next) => {
  try {
    assertDbReady();
    const categories = await Category.find().sort({ category_name: 1 });
    res.status(200).json({ categories });
  } catch (err) {
    next(err);
  }
};

// @route  POST /api/categories
// @access Private (admin only)
// @body   { category_name, description }
const createCategory = async (req, res, next) => {
  try {
    const { category_name, description } = req.body;

    if (!category_name || !description) {
      const err = new Error('category_name and description are required');
      err.status = 400;
      return next(err);
    }

    const normalizedName = String(category_name).trim();
    const normalizedDescription = String(description).trim();

    if (!normalizedName || !normalizedDescription) {
      const err = new Error('category_name and description cannot be blank');
      err.status = 400;
      return next(err);
    }

    // Non-DB validation above has already run — see the equivalent comment
    // on assertDbReady() in authController.register().
    assertDbReady();

    // Pre-check for a friendlier 400 than the raw duplicate-key error the
    // schema's `unique: true` index on category_name would otherwise throw
    // — same reasoning as the existing-email check in
    // authController.register().
    const existing = await Category.findOne({ category_name: normalizedName });
    if (existing) {
      const err = new Error(`Category "${normalizedName}" already exists`);
      err.status = 400;
      return next(err);
    }

    const category = await Category.create({
      category_name: normalizedName,
      description: normalizedDescription,
    });

    res.status(201).json({ category });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    } else if (err.code === 11000) {
      // Duplicate-key race: two requests for the same new category name
      // landing close together both pass the findOne check above, then the
      // second create() trips Mongo's unique index instead — same race
      // authController.register() calls out for email.
      err.message = 'Category name already exists';
      err.status = 400;
    }
    next(err);
  }
};

// @route  PUT /api/categories/:id
// @access Private (admin only)
// @body   { category_name?, description? } — partial update, at least one required
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      const err = new Error('Invalid category id');
      err.status = 400;
      return next(err);
    }

    const { category_name, description } = req.body;
    const updates = {};

    if (category_name !== undefined) {
      const normalizedName = String(category_name).trim();
      if (!normalizedName) {
        const err = new Error('category_name cannot be blank');
        err.status = 400;
        return next(err);
      }
      updates.category_name = normalizedName;
    }

    if (description !== undefined) {
      const normalizedDescription = String(description).trim();
      if (!normalizedDescription) {
        const err = new Error('description cannot be blank');
        err.status = 400;
        return next(err);
      }
      updates.description = normalizedDescription;
    }

    if (Object.keys(updates).length === 0) {
      const err = new Error('Provide at least one of category_name or description to update');
      err.status = 400;
      return next(err);
    }

    assertDbReady();

    if (updates.category_name) {
      const clash = await Category.findOne({
        category_name: updates.category_name,
        _id: { $ne: id },
      });
      if (clash) {
        const err = new Error(`Category "${updates.category_name}" already exists`);
        err.status = 400;
        return next(err);
      }
    }

    const category = await Category.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      const err = new Error('Category not found');
      err.status = 404;
      return next(err);
    }

    res.status(200).json({ category });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    } else if (err.code === 11000) {
      err.message = 'Category name already exists';
      err.status = 400;
    }
    next(err);
  }
};

// @route  DELETE /api/categories/:id
// @access Private (admin only)
//
// Design decision flagged for the record (not specified in
// coding-phases.md's Phase 3 section): deletion is blocked while any
// Question still references this category, rather than cascade-deleting
// them or leaving their `category` field pointing at a document that no
// longer exists. Silently wiping a supplier's question bank as a side
// effect of an admin deleting a category felt like the wrong default for
// something this destructive — flagging it in case that's not what's
// wanted. Only Question is checked here — Result also references
// category, but Result doesn't exist until Phase 4 (seed.js leaves it
// empty for now), so there's nothing to check there yet. Worth
// revisiting once Phase 4 lands, if historical results should block
// deletion too.
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      const err = new Error('Invalid category id');
      err.status = 400;
      return next(err);
    }

    assertDbReady();

    const category = await Category.findById(id);
    if (!category) {
      const err = new Error('Category not found');
      err.status = 404;
      return next(err);
    }

    const questionCount = await Question.countDocuments({ category: id });
    if (questionCount > 0) {
      const err = new Error(
        `Cannot delete category "${category.category_name}" — ${questionCount} question(s) still reference it. Delete or reassign them first.`
      );
      err.status = 409;
      return next(err);
    }

    await category.deleteOne();

    res.status(200).json({ message: 'Category deleted', id });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };

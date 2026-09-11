const express = require('express');
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Public — homepage "Explore IT Categories" and the customer "Available
// Quizzes" page both read this without being logged in.
router.get('/', getCategories);

router.post('/', protect, restrictTo('admin'), createCategory);
router.put('/:id', protect, restrictTo('admin'), updateCategory);
router.delete('/:id', protect, restrictTo('admin'), deleteCategory);

module.exports = router;

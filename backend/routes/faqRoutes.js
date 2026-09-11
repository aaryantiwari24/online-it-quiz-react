const express = require('express');
const { getFAQs, createFAQ, updateFAQ, deleteFAQ } = require('../controllers/faqController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Public — the /faq page reads this without being logged in, same as
// categoryRoutes.js's GET /.
router.get('/', getFAQs);

router.post('/', protect, restrictTo('admin'), createFAQ);
router.put('/:id', protect, restrictTo('admin'), updateFAQ);
router.delete('/:id', protect, restrictTo('admin'), deleteFAQ);

module.exports = router;

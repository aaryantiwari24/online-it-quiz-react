const express = require('express');
const { createSupplier, getUsers, deleteUser } = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, restrictTo('admin'), createSupplier);
router.get('/', protect, restrictTo('admin'), getUsers);
router.delete('/:id', protect, restrictTo('admin'), deleteUser);

module.exports = router;

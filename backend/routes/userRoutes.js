const express = require('express');

const {
  createSupplier,
  getUsers,
  deleteUser,
  updateSupplierProfile,
} = require('../controllers/userController');

const {
  protect,
  restrictTo,
} = require('../middleware/authMiddleware');

const router = express.Router();


/*
 * Supplier profile
 *
 * IMPORTANT:
 * This must come before /:id so "profile" is not treated
 * as a MongoDB user ID.
 */
router.put(
  '/profile',
  protect,
  restrictTo('supplier'),
  updateSupplierProfile
);


/*
 * Admin supplier management
 */
router.post(
  '/',
  protect,
  restrictTo('admin'),
  createSupplier
);

router.get(
  '/',
  protect,
  restrictTo('admin'),
  getUsers
);

router.delete(
  '/:id',
  protect,
  restrictTo('admin'),
  deleteUser
);


module.exports = router;
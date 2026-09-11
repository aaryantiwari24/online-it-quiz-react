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
 * =========================================================
 * SUPPLIER PROFILE
 * =========================================================
 *
 * IMPORTANT:
 * This route must come BEFORE /:id.
 *
 * Otherwise Express could interpret:
 *
 * /profile
 *
 * as:
 *
 * /:id
 */

router.put(
  '/profile',
  protect,
  restrictTo('supplier'),
  updateSupplierProfile
);


/*
 * =========================================================
 * ADMIN - SUPPLIER MANAGEMENT
 * =========================================================
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
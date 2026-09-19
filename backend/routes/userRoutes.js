const express = require('express');

const {
  createSupplier,
  getUsers,
  deleteUser,
  updateSupplierProfile,
  updateAdminProfile,
} = require('../controllers/userController');

const {
  protect,
  restrictTo,
} = require('../middleware/authMiddleware');

const router = express.Router();


/* =========================================================
   SUPPLIER PROFILE
========================================================= */

router.put(
  '/profile',
  protect,
  restrictTo('supplier'),
  updateSupplierProfile
);


/* =========================================================
   ADMIN PROFILE
========================================================= */

router.put(
  '/admin-profile',
  protect,
  restrictTo('admin'),
  updateAdminProfile
);


/* =========================================================
   ADMIN - SUPPLIER MANAGEMENT
========================================================= */

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
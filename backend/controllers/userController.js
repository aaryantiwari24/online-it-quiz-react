const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Question = require('../models/Question');
const { assertDbReady } = require('../config/db');

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const VALID_ROLES = ['admin', 'supplier', 'customer'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MIN_PASSWORD_LENGTH = 6;

const SALT_ROUNDS = 10;


/* =========================================================
   ADMIN - CREATE SUPPLIER
========================================================= */

const createSupplier = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      const err = new Error(
        'Name, email, and password are required'
      );
      err.status = 400;
      return next(err);
    }

    if (typeof password !== 'string') {
      const err = new Error('Password must be a string');
      err.status = 400;
      return next(err);
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      const err = new Error(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      );
      err.status = 400;
      return next(err);
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      const err = new Error(
        'A valid email address is required'
      );
      err.status = 400;
      return next(err);
    }

    assertDbReady();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      const err = new Error(
        'Email is already registered'
      );
      err.status = 400;
      return next(err);
    }

    const hashedPassword = await bcrypt.hash(
      password,
      SALT_ROUNDS
    );

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'supplier',
      phone,
    });

    const safeUser = await User.findById(
      user._id
    ).select('-password');

    res.status(201).json({
      user: safeUser,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    } else if (err.code === 11000) {
      err.message = 'Email is already registered';
      err.status = 400;
    }

    next(err);
  }
};


/* =========================================================
   ADMIN - GET USERS
========================================================= */

const getUsers = async (req, res, next) => {
  try {
    const { role } = req.query;

    if (
      role !== undefined &&
      !VALID_ROLES.includes(role)
    ) {
      const err = new Error(
        `role must be one of: ${VALID_ROLES.join(', ')}`
      );
      err.status = 400;
      return next(err);
    }

    assertDbReady();

    const filter = role ? { role } : {};

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      users,
    });
  } catch (err) {
    next(err);
  }
};


/* =========================================================
   ADMIN - DELETE SUPPLIER
========================================================= */

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      const err = new Error('Invalid user id');
      err.status = 400;
      return next(err);
    }

    assertDbReady();

    const user = await User.findById(id);

    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      return next(err);
    }

    if (user.role !== 'supplier') {
      const err = new Error(
        'This endpoint currently only supports removing supplier accounts'
      );
      err.status = 400;
      return next(err);
    }

    const questionCount =
      await Question.countDocuments({
        createdBy: user._id,
      });

    if (questionCount > 0) {
      const err = new Error(
        `Cannot delete "${user.name}" — ${questionCount} question(s) still reference them as creator. Delete or reassign those first.`
      );

      err.status = 409;
      return next(err);
    }

    await user.deleteOne();

    res.status(200).json({
      message: 'Supplier deleted',
      id,
    });
  } catch (err) {
    next(err);
  }
};


/* =========================================================
   SUPPLIER - UPDATE OWN PROFILE
========================================================= */

const updateSupplierProfile = async (
  req,
  res,
  next
) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email) {
      const err = new Error(
        'Name and Email are required fields.'
      );

      err.status = 400;
      return next(err);
    }

    const trimmedName = String(name).trim();

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    if (!trimmedName) {
      const err = new Error(
        'Name and Email are required fields.'
      );

      err.status = 400;
      return next(err);
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      const err = new Error(
        'A valid email address is required'
      );

      err.status = 400;
      return next(err);
    }

    assertDbReady();

    const supplier = await User.findById(
      req.user._id
    );

    if (!supplier) {
      const err = new Error(
        'Supplier account not found'
      );

      err.status = 404;
      return next(err);
    }

    if (supplier.role !== 'supplier') {
      const err = new Error(
        'Only supplier accounts can update this profile'
      );

      err.status = 403;
      return next(err);
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: supplier._id },
    });

    if (existingUser) {
      const err = new Error(
        'Email is already registered'
      );

      err.status = 400;
      return next(err);
    }

    supplier.name = trimmedName;
    supplier.email = normalizedEmail;

    /*
     * PHP behavior:
     * If password is blank, keep the existing password.
     */
    if (
      typeof password === 'string' &&
      password.length > 0
    ) {
      supplier.password = await bcrypt.hash(
        password,
        SALT_ROUNDS
      );
    }

    await supplier.save();

    const safeUser = await User.findById(
      supplier._id
    ).select('-password');

    res.status(200).json({
      message: 'Profile updated successfully!',
      user: safeUser,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    } else if (err.code === 11000) {
      err.message = 'Email is already registered';
      err.status = 400;
    }

    next(err);
  }
};


module.exports = {
  createSupplier,
  getUsers,
  deleteUser,
  updateSupplierProfile,
};
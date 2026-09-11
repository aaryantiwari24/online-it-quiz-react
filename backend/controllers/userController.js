const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Question = require('../models/Question');
const { assertDbReady } = require('../config/db');

// See the identical helper in categoryController.js/questionController.js/
// resultController.js for why this is kept file-local instead of shared.
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const VALID_ROLES = ['admin', 'supplier', 'customer'];

// Same reasoning, same regex, same default as authController.js's own
// copies of these three — kept file-local rather than shared, matching
// this codebase's per-file self-containment convention (see e.g.
// Register.jsx's header comment on ROLE_HOME for the frontend's version
// of the same choice). If either file's copy ever changes, check whether
// the other should too.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const SALT_ROUNDS = 10;

// Deliberately NOT authController.js's toSafeUser shape ({id, ...}) —
// this file's existing getUsers already returns raw docs via
// .select('-password') ({_id, createdAt, ...}), and ManageSuppliers.jsx's
// table reads s._id / s.createdAt from those rows. createSupplier below
// needs to return something the frontend can splice into that same array
// and have it render like every other row, so it matches getUsers'
// shape instead of introducing a second, differently-shaped one.

// @route  POST /api/users
// @access Private (admin only)
// @body   { name, email, password, phone? }
//
// New, closing the exact gap AUDIT_FIXES.md's F2 finding named: "no
// admin-user-management endpoints exist yet at all" for creating anyone.
// Added once F2 stopped being "flagged, not fixed" and became a decision
// (see authController.js's PUBLIC_REGISTRATION_ROLES comment) — public
// /api/auth/register now only ever creates role: 'customer', so this is
// the replacement path for supplier accounts, not an addition alongside
// the old one.
//
// Deliberately supplier-only, not a generic "admin creates any role"
// endpoint — same scoping choice deleteUser below already made, for the
// same reason: nothing in context.md/coding-phases.md specifies admin-
// creates-admin semantics (self-service? invite-only? does the creating
// admin's own session change?), and this endpoint only exists to solve
// the supplier case F2 actually named. Extending to admin/customer
// creation would need those questions answered first, same as
// deleteUser's own comment on why it stayed supplier-scoped.
//
// Validation mirrors authController.js's register() — same field checks,
// same order (type check before length check before DB), same
// EMAIL_REGEX/MIN_PASSWORD_LENGTH/SALT_ROUNDS — because this creates the
// exact same kind of row register() does, just through an admin-only
// door with role locked server-side instead of client-supplied. It does
// not verify the caller's own current password (unlike, say, a change-
// email flow might) since restrictTo('admin') already gates the route;
// re-checking the admin's password here isn't part of that gate.
const createSupplier = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      const err = new Error('Name, email, and password are required');
      err.status = 400;
      return next(err);
    }

    // Same reasoning as register()'s identical check: bcrypt.hash() throws
    // synchronously on a non-string input, so this needs to be a
    // validation 400, not an uncaught crash.
    if (typeof password !== 'string') {
      const err = new Error('Password must be a string');
      err.status = 400;
      return next(err);
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      const err = new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      err.status = 400;
      return next(err);
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      const err = new Error('A valid email address is required');
      err.status = 400;
      return next(err);
    }

    // All non-DB validation above has already run — same placement
    // reasoning as register()'s identical call.
    assertDbReady();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const err = new Error('Email is already registered');
      err.status = 400;
      return next(err);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // role is fixed here, never taken from req.body — the entire point of
    // this endpoint over the old open register() path is that the caller
    // doesn't get to choose.
    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'supplier',
      phone,
    });

    // Re-fetch with .select('-password') rather than stripping the field
    // off the in-memory `user` from create() above — matches how every
    // other read in this file (getUsers) gets its shape, and avoids
    // manually deleting a field off a Mongoose doc (which has its own
    // sharp edges around virtuals/toJSON) just to get the same result an
    // existing query already produces cleanly.
    const safeUser = await User.findById(user._id).select('-password');

    res.status(201).json({ user: safeUser });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    } else if (err.code === 11000) {
      // Same duplicate-key race as register() — two requests for the same
      // email landing close together both pass findOne above, then the
      // second create() trips Mongo's unique index instead.
      err.message = 'Email is already registered';
      err.status = 400;
    }
    next(err);
  }
};

// @route  GET /api/users
// @access Private (admin only)
// @query  ?role=admin|supplier|customer (optional filter)
//
// New in Phase 7 — no admin-user-management endpoint existed anywhere
// before this (see AUDIT_FIXES.md's F2 finding). Built to back the
// "Manage Suppliers" nav item coding-phases.md's Phase 7 section lists
// but doesn't spell out a page for, the same way it does for the other
// four. Left generically filterable by role rather than hardcoded to
// suppliers — same reasoning as questionController.js's optional
// ?difficulty filter — even though the only frontend page calling this
// so far always passes ?role=supplier.
const getUsers = async (req, res, next) => {
  try {
    const { role } = req.query;

    if (role !== undefined && !VALID_ROLES.includes(role)) {
      const err = new Error(`role must be one of: ${VALID_ROLES.join(', ')}`);
      err.status = 400;
      return next(err);
    }

    assertDbReady();

    const filter = role ? { role } : {};
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });

    res.status(200).json({ users });
  } catch (err) {
    next(err);
  }
};

// @route  DELETE /api/users/:id
// @access Private (admin only)
//
// Deliberately scoped to supplier accounts only for now, not a general
// account-deletion endpoint — Phase 7 only asked for "Manage Suppliers".
// Customer accounts carry Results/Certificates whose fate on deletion
// (cascade, block, or leave orphaned) isn't decided anywhere in
// context.md or coding-phases.md, and admin accounts deleting each other
// isn't either; flagging both as open questions rather than guessing at
// semantics for data this phase was never asked to touch.
//
// For the supplier case this does handle: blocks deletion while any
// Question still references them as creator, the same reference-
// integrity stance categoryController.js's deleteCategory takes for
// questions referencing a category (see that function's own comment) —
// silently orphaning a question's `createdBy` felt like the wrong
// default here too.
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
      const err = new Error('This endpoint currently only supports removing supplier accounts');
      err.status = 400;
      return next(err);
    }

    const questionCount = await Question.countDocuments({ createdBy: user._id });
    if (questionCount > 0) {
      const err = new Error(
        `Cannot delete "${user.name}" — ${questionCount} question(s) still reference them as creator. Delete or reassign those first.`
      );
      err.status = 409;
      return next(err);
    }

    await user.deleteOne();

    res.status(200).json({ message: 'Supplier deleted', id });
  } catch (err) {
    next(err);
  }
};

module.exports = { createSupplier, getUsers, deleteUser };

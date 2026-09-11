const mongoose = require('mongoose');

// Single collection for admin / supplier / customer, distinguished by `role`.
// (Locked decision #1 in coding-phases.md — do not split into 3 collections.)
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      // Always a bcrypt hash by the time it reaches the DB — hashed in
      // authController on register, and (as of Phase 2) in
      // backend/scripts/seed.js too, so every account in the database is
      // something bcrypt.compare() in login can actually match against.
    },
    role: {
      type: String,
      enum: ['admin', 'supplier', 'customer'],
      required: [true, 'Role is required'],
      default: 'customer',
    },
    phone: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true } // gives us createdAt / updatedAt automatically
);

module.exports = mongoose.model('User', userSchema);

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const User = require('../models/User')
const { assertDbReady } = require('../config/db')

const PUBLIC_REGISTRATION_ROLES = [
  'customer',
]

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MIN_PASSWORD_LENGTH = 6
const MIN_NAME_LENGTH = 2

const SALT_ROUNDS = 10

const generateToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn:
        process.env.JWT_EXPIRES_IN ||
        '30d',
    }
  )

const toSafeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || null,
})

/*
 * CUSTOMER REGISTRATION
 *
 * Matches the PHP customer_register.php flow:
 *
 * - name required
 * - email required
 * - password required
 * - valid email
 * - name minimum 2 characters
 * - password minimum 6 characters
 * - duplicate email rejected
 * - password hashed
 * - customer account created
 * - NO automatic login
 */
const register = async (
  req,
  res,
  next
) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
    } = req.body

    if (
      !name ||
      !email ||
      !password
    ) {
      const err = new Error(
        'Name, email, and password are required'
      )

      err.status = 400

      return next(err)
    }

    if (
      typeof name !== 'string'
    ) {
      const err = new Error(
        'Name must be a string'
      )

      err.status = 400

      return next(err)
    }

    if (
      name.trim().length <
      MIN_NAME_LENGTH
    ) {
      const err = new Error(
        `Name must be at least ${MIN_NAME_LENGTH} characters`
      )

      err.status = 400

      return next(err)
    }

    if (
      typeof password !== 'string'
    ) {
      const err = new Error(
        'Password must be a string'
      )

      err.status = 400

      return next(err)
    }

    if (
      password.length <
      MIN_PASSWORD_LENGTH
    ) {
      const err = new Error(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      )

      err.status = 400

      return next(err)
    }

    if (
      role &&
      !PUBLIC_REGISTRATION_ROLES.includes(
        role
      )
    ) {
      const err = new Error(
        'Only customer registration is allowed'
      )

      err.status = 400

      return next(err)
    }

    const normalizedName =
      name.trim()

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase()

    if (
      !EMAIL_REGEX.test(
        normalizedEmail
      )
    ) {
      const err = new Error(
        'A valid email address is required'
      )

      err.status = 400

      return next(err)
    }

    assertDbReady()

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      })

    if (existingUser) {
      const err = new Error(
        'Email is already registered'
      )

      err.status = 400

      return next(err)
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        SALT_ROUNDS
      )

    const user =
      await User.create({
        name: normalizedName,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'customer',
        phone,
      })

    /*
     * IMPORTANT:
     * Do NOT generate a JWT here.
     *
     * The customer must log in separately.
     */
    return res.status(201).json({
      message:
        'Registration successful! You can now login.',
      user: toSafeUser(user),
    })
  } catch (err) {
    if (
      err.name ===
      'ValidationError'
    ) {
      err.status = 400
    } else if (
      err.code === 11000
    ) {
      err.message =
        'Email is already registered'

      err.status = 400
    }

    next(err)
  }
}

/*
 * LOGIN
 *
 * Works for:
 * - customer
 * - supplier
 * - admin
 *
 * The frontend decides which role-specific
 * login was selected and verifies that the
 * returned account has the same role.
 */
const login = async (
  req,
  res,
  next
) => {
  try {
    const {
      email,
      password,
    } = req.body

    if (
      !email ||
      !password
    ) {
      const err = new Error(
        'Email and password are required'
      )

      err.status = 400

      return next(err)
    }

    if (
      typeof password !== 'string'
    ) {
      const err = new Error(
        'Password must be a string'
      )

      err.status = 400

      return next(err)
    }

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase()

    assertDbReady()

    const user =
      await User.findOne({
        email: normalizedEmail,
      })

    /*
     * Same message whether email doesn't
     * exist or password is incorrect.
     */
    if (!user) {
      const err = new Error(
        'Invalid email or password'
      )

      err.status = 401

      return next(err)
    }

    const isMatch =
      await bcrypt.compare(
        password,
        user.password
      )

    if (!isMatch) {
      const err = new Error(
        'Invalid email or password'
      )

      err.status = 401

      return next(err)
    }

    const token =
      generateToken(user)

    return res.status(200).json({
      token,
      user: toSafeUser(user),
    })
  } catch (err) {
    next(err)
  }
}

/*
 * GET CURRENT USER
 */
const getMe = (
  req,
  res
) => {
  return res.status(200).json({
    user: toSafeUser(
      req.user
    ),
  })
}

module.exports = {
  register,
  login,
  getMe,
}
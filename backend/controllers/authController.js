const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const User = require('../models/User')
const {
  assertDbReady,
} = require('../config/db')

const PUBLIC_REGISTRATION_ROLES = [
  'customer',
  'supplier',
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
 * REGISTER
 *
 * Public registration is allowed for:
 *
 * - customer
 * - supplier
 *
 * Admin cannot register publicly.
 *
 * Registration does NOT automatically log
 * the user in.
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

    const normalizedName =
      name.trim()

    if (
      normalizedName.length <
      MIN_NAME_LENGTH
    ) {
      const err = new Error(
        `Name must contain at least ${MIN_NAME_LENGTH} characters.`
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
        `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`
      )

      err.status = 400

      return next(err)
    }

    /*
     * Default to customer if role isn't supplied.
     */
    const registrationRole =
      role || 'customer'

    /*
     * Never allow admin through the
     * public registration endpoint.
     */
    if (
      !PUBLIC_REGISTRATION_ROLES.includes(
        registrationRole
      )
    ) {
      const err = new Error(
        'Only customer and supplier registration is allowed'
      )

      err.status = 400

      return next(err)
    }

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
        'Please enter a valid email address.'
      )

      err.status = 400

      return next(err)
    }

    assertDbReady()

    /*
     * Check email globally.
     *
     * This prevents the same email from being
     * registered as another account.
     */
    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      })

    if (existingUser) {
      const err = new Error(
        'Email is already registered.'
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
        role: registrationRole,
        phone,
      })

    /*
     * IMPORTANT:
     *
     * Do NOT create a JWT here.
     *
     * User must login after registration.
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
        'Email is already registered.'

      err.status = 400
    }

    next(err)
  }
}

/*
 * LOGIN
 *
 * Works for:
 *
 * - customer
 * - supplier
 * - admin
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
     * Don't reveal whether the email
     * exists or not.
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
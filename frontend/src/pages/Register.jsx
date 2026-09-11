import { useEffect, useState } from 'react'
import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

const MIN_PASSWORD_LENGTH = 6

const ROLE_HOME = {
  admin: '/admin',
  supplier: '/supplier',
  customer: '/customer',
}

const ROLE_LABELS = {
  customer: 'Student Register',
  supplier: 'Supplier Register',
}

const LOGIN_LINKS = {
  customer: '/login?role=customer',
  supplier: '/login?role=supplier',
}

const Register = () => {
  const {
    register,
    isAuthenticated,
    user,
    loading,
  } = useAuth()

  const navigate = useNavigate()
  const location = useLocation()

  const requestedRole = new URLSearchParams(
    location.search
  ).get('role')

  /*
   * Only customer and supplier are allowed
   * to register publicly.
   *
   * Admin has no public registration.
   */
  const role =
    requestedRole === 'supplier'
      ? 'supplier'
      : 'customer'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(
        ROLE_HOME[user?.role] || '/',
        { replace: true }
      )
    }
  }, [
    loading,
    isAuthenticated,
    user,
    navigate,
  ])

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setSuccess('')

    if (name.trim().length < 2) {
      setError(
        'Name must contain at least 2 characters.'
      )
      return
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`
      )
      return
    }

    setSubmitting(true)

    try {
      await register(
        name,
        email,
        password,
        role
      )

      /*
       * Registration does NOT automatically log
       * the user in.
       *
       * This matches the PHP version.
       */
      setSuccess(
        'Registration successful! You can now login.'
      )

      setName('')
      setEmail('')
      setPassword('')
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Registration failed. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <Link
        to="/"
        className="auth-brand"
      >
        IT Quiz
      </Link>

      <div className="auth-card">
        <h1>
          {ROLE_LABELS[role]}
        </h1>

        {role === 'supplier' && (
          <p className="auth-subtitle">
            Register to add and manage quiz questions.
          </p>
        )}

        {error && (
          <p
            className="auth-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            className="auth-success"
            role="status"
          >
            {success}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="auth-field">
            <label htmlFor="register-name">
              Full Name
            </label>

            <input
              id="register-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="register-email">
              Email Address
            </label>

            <input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="register-password">
              Password
            </label>

            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              minLength={MIN_PASSWORD_LENGTH}
              required
            />

            <small>
              Minimum 6 characters
            </small>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting}
          >
            {submitting
              ? 'Creating Account…'
              : 'Register Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}

          <Link
            to={LOGIN_LINKS[role]}
          >
            Login here
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

// Backend's MIN_PASSWORD_LENGTH (authController.js) — mirrored here only
// for early client-side feedback. The server is the real source of truth;
// if that constant ever changes, update this to match.
const MIN_PASSWORD_LENGTH = 8

// Where an already-logged-in visitor of each role belongs. Mirrors
// Login.jsx's own ROLE_HOME — duplicated rather than imported/shared,
// matching this project's per-file self-containment convention (the
// same choice every page-level CSS file already makes, per e.g.
// Home.css's header comment).
const ROLE_HOME = {
  admin: '/admin',
  supplier: '/supplier',
  customer: '/customer',
}

const Register = () => {
  const { register, isAuthenticated, user, loading } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Self-registration always creates role: 'customer' (see
  // AuthContext.register) — but this effect also covers an already-
  // authenticated visitor who simply lands on /register (stale link,
  // typed URL, or an admin/supplier clicking the homepage's "Start Quiz"
  // CTA — see PHASE_9_VERIFICATION.md's design decision #4). That visitor
  // isn't necessarily a customer, so route by their real role like
  // Login.jsx does rather than assuming /customer — hardcoding it sent
  // an already-logged-in admin/supplier to a route ProtectedRoute would
  // immediately bounce to "/" for wrong role. Phase 10 protected-route
  // check.
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(ROLE_HOME[user.role] || '/customer', { replace: true })
    }
  }, [loading, isAuthenticated, user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register(name, email, password)
      // Redirect is handled by the effect above once isAuthenticated flips.
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <Link to="/" className="auth-brand">IT Quiz</Link>
      <div className="auth-card">
        <h1>Student Register</h1>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="register-name">Full Name</label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="register-email">Email Address</label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
            />
          </div>

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Creating Account…' : 'Register Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  )
}

export default Register

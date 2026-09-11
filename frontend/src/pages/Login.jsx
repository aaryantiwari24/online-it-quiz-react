import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

// Where each role lands after logging in. Phase 0 already scaffolded
// placeholder routes at these exact paths for /admin, /supplier, and
// /customer — Phase 6/7/8 build real dashboards behind them later, but
// the destination path itself shouldn't need to change when they do.
const ROLE_HOME = {
  admin: '/admin',
  supplier: '/supplier',
  customer: '/customer',
}

const Login = () => {
  const { login, isAuthenticated, user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Covers two cases with one effect: (a) an already-logged-in visitor
  // landing on /login directly (browser back, stale bookmark, etc.), and
  // (b) the redirect right after handleSubmit's own login() call succeeds
  // — both just mean "isAuthenticated became true while sitting on this
  // page". Waiting on `loading` avoids bouncing a user who actually has a
  // valid stored token before AuthContext's GET /api/auth/me check has
  // resolved.
  useEffect(() => {
    if (!loading && isAuthenticated) {
      const from = location.state?.from?.pathname
      navigate(from || ROLE_HOME[user.role] || '/', { replace: true })
    }
  }, [loading, isAuthenticated, user, location, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
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
        <h1>Log In</h1>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Logging In…' : 'Log In'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  )
}

export default Login

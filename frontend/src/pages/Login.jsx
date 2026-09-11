import { useEffect, useState } from 'react'
import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

const ROLE_HOME = {
  admin: '/admin',
  supplier: '/supplier',
  customer: '/customer',
}

const ROLE_LABELS = {
  admin: 'Admin Login',
  supplier: 'Supplier Login',
  customer: 'Student Login',
}

const ROLE_REGISTER = {
  supplier: '/register?role=supplier',
  customer: '/register?role=customer',
}

const Login = () => {
  const {
    login,
    logout,
    isAuthenticated,
    user,
    loading,
  } = useAuth()

  const navigate = useNavigate()
  const location = useLocation()

  const requestedRole = new URLSearchParams(
    location.search
  ).get('role')

  const role =
    requestedRole === 'admin' ||
    requestedRole === 'supplier' ||
    requestedRole === 'customer'
      ? requestedRole
      : 'customer'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && isAuthenticated) {
      const from = location.state?.from?.pathname

      navigate(
        from ||
          ROLE_HOME[user?.role] ||
          '/',
        { replace: true }
      )
    }
  }, [
    loading,
    isAuthenticated,
    user,
    location,
    navigate,
  ])

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setSubmitting(true)

    try {
      const loggedInUser = await login(
        email,
        password
      )

      /*
       * Make sure the account belongs to
       * the role selected on the Home page.
       */
      if (loggedInUser.role !== role) {
        logout()

        setError(
          `This account is not a ${
            ROLE_LABELS[role]
              .replace(' Login', '')
          } account.`
        )

        setSubmitting(false)
        return
      }

      navigate(
        ROLE_HOME[loggedInUser.role],
        { replace: true }
      )
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Invalid email or password.'
      )

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

        {error && (
          <p
            className="auth-error"
            role="alert"
          >
            {error}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="auth-field">
            <label htmlFor="login-email">
              Email Address
            </label>

            <input
              id="login-email"
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
            <label htmlFor="login-password">
              Password
            </label>

            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting}
          >
            {submitting
              ? 'Logging In…'
              : 'Log In'}
          </button>
        </form>

        {/* Customer and Supplier can register.
            Admin cannot register publicly. */}
        {role !== 'admin' && (
          <p className="auth-switch">
            Don't have an account?{' '}

            <Link
              to={
                ROLE_REGISTER[role]
              }
            >
              Register here
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

export default Login
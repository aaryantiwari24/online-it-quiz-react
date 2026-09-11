import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import StatusPill from '../../components/customer/StatusPill'
import './Customer.css'

const STATUS_TONE = { Pass: 'pass', Fail: 'fail' }

/**
 * Landing page for /customer — summary stats derived entirely from
 * GET /api/results/me (no separate stats endpoint exists, and adding one
 * just to precompute counts the client can derive itself from a list it
 * already has to fetch would be the "unnecessary backend endpoint" this
 * project's earlier phases have consistently avoided). Empty-results and
 * loading/error states are handled explicitly rather than assuming the
 * array is always populated, since a brand-new customer's first visit
 * here is exactly `results: []`.
 */
const Dashboard = () => {
  const { user } = useAuth()
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const { data } = await api.get('/results/me')
        if (!cancelled) setResults(data.results)
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Could not load your results.')
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const loading = results === null && !error
  const attempted = results ?? []
  const totalAttempts = attempted.length
  const passedCount = attempted.filter((r) => r.status === 'Pass').length
  const averagePercentage = totalAttempts
    ? Math.round(attempted.reduce((sum, r) => sum + r.percentage, 0) / totalAttempts)
    : 0
  const recent = attempted.slice(0, 5)

  return (
    <div>
      <div className="customer-page-header">
        <h1>Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p>Here's how your evaluations are going.</p>
      </div>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p>Loading your dashboard…</p>
      ) : (
        <>
          <div className="customer-grid customer-grid--stats" style={{ marginBottom: 28 }}>
            <div className="card">
              <p style={{ margin: 0, color: 'var(--color-ink-soft)', fontSize: '0.85rem' }}>
                Quizzes Attempted
              </p>
              <p
                style={{
                  margin: '6px 0 0',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '2rem',
                  fontWeight: 700,
                }}
              >
                {totalAttempts}
              </p>
            </div>
            <div className="card">
              <p style={{ margin: 0, color: 'var(--color-ink-soft)', fontSize: '0.85rem' }}>
                Certificates Earned
              </p>
              <p
                style={{
                  margin: '6px 0 0',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'var(--color-success)',
                }}
              >
                {passedCount}
              </p>
            </div>
            <div className="card">
              <p style={{ margin: 0, color: 'var(--color-ink-soft)', fontSize: '0.85rem' }}>
                Average Score
              </p>
              <p
                style={{
                  margin: '6px 0 0',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '2rem',
                  fontWeight: 700,
                }}
              >
                {averagePercentage}%
              </p>
            </div>
          </div>

          <div className="card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <h2 style={{ fontSize: '1.1rem' }}>Recent Activity</h2>
              {totalAttempts > 0 && (
                <Link to="/customer/history" className="btn btn--ghost btn--sm">
                  View All
                </Link>
              )}
            </div>

            {recent.length === 0 ? (
              <div className="empty-state">
                <h3>No attempts yet</h3>
                <p>Take your first quiz to see your progress here.</p>
                <Link to="/customer/quizzes" className="btn btn--primary" style={{ marginTop: 16 }}>
                  Browse Available Quizzes
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recent.map((r) => (
                  <Link
                    key={r._id}
                    to={`/customer/results/${r._id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-control)',
                      border: '1px solid var(--color-border)',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: 700 }}>
                        {r.category?.category_name ?? 'Unknown Category'}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
                        {r.difficulty} · {new Date(r.attemptDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {r.percentage}%
                      </span>
                      <StatusPill label={r.status} tone={STATUS_TONE[r.status]} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Dashboard

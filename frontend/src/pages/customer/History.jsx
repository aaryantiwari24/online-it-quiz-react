import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import StatusPill from '../../components/customer/StatusPill'
import './Customer.css'
import './History.css'

const STATUS_TONE = { Pass: 'pass', Fail: 'fail' }
const DIFFICULTY_TONE = { Easy: 'easy', Medium: 'medium', Hard: 'hard' }

/**
 * /customer/history — the full-list counterpart to Dashboard.jsx's
 * top-5 "Recent Activity" (same GET /api/results/me endpoint, no
 * separate paginated route exists or is needed at this data volume —
 * a customer's total attempt count is bounded by how many quizzes they
 * can realistically take). Each row links to /customer/results/:id for
 * the full review, and to the certificate page directly when the
 * attempt passed, so a passing result is reachable from history without
 * detouring through the results page first.
 */
const History = () => {
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
          setError(err.response?.data?.error || 'Could not load your history.')
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const loading = results === null && !error

  return (
    <div>
      <div className="customer-page-header">
        <h1>Evaluation History</h1>
        <p>Every quiz you've attempted, most recent first.</p>
      </div>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      {loading && <p>Loading your history…</p>}

      {!loading && results?.length === 0 && (
        <div className="empty-state card">
          <h3>No attempts yet</h3>
          <p>Once you take a quiz, it'll show up here.</p>
          <Link to="/customer/quizzes" className="btn btn--primary" style={{ marginTop: 16 }}>
            Browse Available Quizzes
          </Link>
        </div>
      )}

      {results?.length > 0 && (
        <div className="card history-table-card">
          <table className="history-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Difficulty</th>
                <th>Score</th>
                <th>Status</th>
                <th>Date</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r._id}>
                  <td data-label="Category">{r.category?.category_name ?? 'Unknown Category'}</td>
                  <td data-label="Difficulty">
                    <StatusPill label={r.difficulty} tone={DIFFICULTY_TONE[r.difficulty]} />
                  </td>
                  <td data-label="Score" className="history-table-score">
                    {r.score}/{r.totalQuestions} ({r.percentage}%)
                  </td>
                  <td data-label="Status">
                    <StatusPill label={r.status} tone={STATUS_TONE[r.status]} />
                  </td>
                  <td data-label="Date">{new Date(r.attemptDate).toLocaleDateString()}</td>
                  <td data-label="Actions" className="history-table-actions">
                    <Link to={`/customer/results/${r._id}`} className="btn btn--ghost btn--sm">
                      Review
                    </Link>
                    {r.status === 'Pass' && (
                      <Link to={`/customer/certificate/${r._id}`} className="btn btn--ghost btn--sm">
                        Certificate
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default History

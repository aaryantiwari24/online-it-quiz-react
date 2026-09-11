import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../services/api'
import ScoreRing from '../../components/customer/ScoreRing'
import StatusPill from '../../components/customer/StatusPill'
import './Customer.css'
import './Results.css'

const OPTION_KEYS = ['A', 'B', 'C', 'D']

/**
 * /customer/results/:id — score summary plus the full per-question
 * "Detailed Answer Review" the Result model's own comment says the
 * reference design calls for (Your Answer vs Correct Answer per
 * question). Single GET /api/results/:id call: getResultById already
 * populates answers.question with the question text, all four options,
 * and correct_answer (see that route's own comment) — there is no
 * separate review endpoint, and none is needed, since everything the
 * review below renders comes out of that one populated document.
 *
 * assertCanViewResult on the backend (owner-or-admin) means a 403 here
 * is a real possible response, not just a 404 — handled as its own
 * branch so the message shown matches what actually happened rather than
 * a generic "not found".
 */
const Results = () => {
  const { id } = useParams()
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [errorStatus, setErrorStatus] = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const { data } = await api.get(`/results/${id}`)
        if (!cancelled) setResult(data.result)
      } catch (err) {
        if (!cancelled) {
          setErrorStatus(err.response?.status ?? null)
          setError(err.response?.data?.error || 'Could not load this result.')
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (error) {
    return (
      <div className="card empty-state">
        <h3>{errorStatus === 403 ? "This result isn't yours to view" : "Couldn't load this result"}</h3>
        <p>{error}</p>
        <Link to="/customer/history" className="btn btn--primary" style={{ marginTop: 16 }}>
          Back to History
        </Link>
      </div>
    )
  }

  if (!result) {
    return <p>Loading results…</p>
  }

  const passed = result.status === 'Pass'
  const correctCount = result.score
  const incorrectCount = result.totalQuestions - result.score

  return (
    <div className="results-page">
      <div className="card results-summary">
        <ScoreRing percentage={result.percentage} size={160} label={result.status} />
        <div className="results-summary-details">
          <p className="results-summary-eyebrow">{result.category?.category_name ?? 'Quiz'}</p>
          <h1 style={{ margin: '2px 0 10px' }}>
            You {passed ? 'passed' : 'did not pass'} this evaluation
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <StatusPill label={result.status} tone={passed ? 'pass' : 'fail'} />
            <StatusPill
              label={result.difficulty}
              tone={result.difficulty.toLowerCase()}
            />
            <span style={{ color: 'var(--color-ink-soft)', fontSize: '0.9rem' }}>
              {result.score} / {result.totalQuestions} correct ·{' '}
              {new Date(result.attemptDate).toLocaleString()}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            {passed && (
              <Link to={`/customer/certificate/${result._id}`} className="btn btn--success">
                View Certificate
              </Link>
            )}
            <Link to="/customer/quizzes" className="btn btn--ghost">
              Take Another Quiz
            </Link>
            <Link to="/customer/dashboard" className="btn btn--ghost">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="results-stats">
        <div className="card results-stat results-stat--correct">
          <p className="results-stat-value">{correctCount}</p>
          <p className="results-stat-label">Correct</p>
        </div>
        <div className="card results-stat results-stat--incorrect">
          <p className="results-stat-value">{incorrectCount}</p>
          <p className="results-stat-label">Incorrect</p>
        </div>
        <div className="card results-stat">
          <p className="results-stat-value">{result.totalQuestions}</p>
          <p className="results-stat-label">Total</p>
        </div>
      </div>

      <h2 className="results-review-heading">Answer Review</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {result.answers.map((answer, index) => {
          const q = answer.question
          // If a Question was deleted after this Result was created, the
          // populate above leaves `question` null rather than throwing —
          // Mongoose's normal behavior for a dangling ref. Shown as its
          // own row rather than crashing the whole review on one bad
          // answer.
          if (!q) {
            return (
              <div key={index} className="card review-row">
                <p className="review-question-text" style={{ color: 'var(--color-ink-soft)' }}>
                  Question {index + 1}: this question is no longer available.
                </p>
              </div>
            )
          }

          return (
            <div
              key={q._id}
              className={`card review-row ${answer.isCorrect ? 'review-row--correct' : 'review-row--incorrect'}`}
            >
              <div className="review-row-header">
                <span className="review-question-number">Q{index + 1}</span>
                <StatusPill
                  label={answer.isCorrect ? 'Correct' : 'Incorrect'}
                  tone={answer.isCorrect ? 'pass' : 'fail'}
                />
              </div>
              <p className="review-question-text">{q.question}</p>

              <div className="review-options">
                {OPTION_KEYS.map((key) => {
                  const optionText = q[`option_${key.toLowerCase()}`]
                  const isCorrectAnswer = key === q.correct_answer
                  const isSelected = key === answer.selectedOption
                  return (
                    <div
                      key={key}
                      className={`review-option ${isCorrectAnswer ? 'review-option--correct' : ''} ${
                        isSelected && !isCorrectAnswer ? 'review-option--wrong-pick' : ''
                      }`}
                    >
                      <span className="review-option-key">{key}</span>
                      <span>{optionText}</span>
                      {isSelected && <span className="review-option-tag">Your answer</span>}
                      {isCorrectAnswer && !isSelected && (
                        <span className="review-option-tag">Correct answer</span>
                      )}
                    </div>
                  )
                })}
                {!answer.selectedOption && (
                  <p className="review-unanswered-note">You did not answer this question.</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Results

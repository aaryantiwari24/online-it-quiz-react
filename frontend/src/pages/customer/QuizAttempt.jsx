import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import useCountdown from '../../hooks/useCountdown'
import './Customer.css'
import './Quiz.css'

const ANSWER_KEYS = ['A', 'B', 'C', 'D']

/**
 * Quiz-taking screen at /customer/quiz/:categoryId/:difficulty.
 *
 * UPDATED — security fix, "no server-side quiz attempt" (see
 * SECURITY_FIX_SERVER_SIDE_QUIZ_ATTEMPT.md). This used to fetch its
 * question set from GET /api/questions/random/:categoryId and hold every
 * bit of exam state (which questions, how much time is left, whether
 * it's already been submitted) purely in this component's React state —
 * meaning the server had no record of any of it until a POST /api/results
 * showed up claiming to be the final answers. It now calls
 * POST /api/quiz-attempts on mount instead, which creates (or resumes —
 * see that endpoint's own comment in quizAttemptController.js) a real
 * server-side QuizAttempt: the same sanitized `questions` array as
 * before, plus an `attempt` object whose `expiresAt` is what the
 * countdown below is actually seeded from, and whose `_id` is what gets
 * submitted to — POST /api/quiz-attempts/:id/submit — instead of the old
 * POST /api/results. The server independently re-checks that same
 * expiresAt (with a small grace period for network latency — see
 * SUBMISSION_GRACE_SECONDS in quizAttemptController.js) when the
 * submission actually arrives, so this component's own countdown display
 * is just that — a display. It isn't what actually stops a late or
 * replayed submission from being graded; the server does that
 * independently of whatever this component shows on screen.
 *
 * One consequence worth knowing: reloading this page mid-quiz no longer
 * grants a fresh full-length timer or a freshly-reshuffled question set —
 * POST /api/quiz-attempts resumes the same attempt: same questions, same
 * original deadline. It does still lose whatever options were already
 * selected, though — only the *shape* of the attempt (which questions,
 * start/expiry time, submission state) lives server-side now;
 * in-progress answer selections are still only ever held here in
 * `answers` state, same as before, and are only ever sent to the server
 * once, at final submission.
 *
 * Submission race guard: both the manual "Submit Quiz" button and the
 * timer's onExpire call the same `submit` function. `submittingRef` (not
 * state — a state check inside an event handler can still read a stale
 * value from before React re-renders) is set synchronously the instant
 * either path starts, so if the timer expires in the same tick as the
 * user clicking Submit, only the first one through actually POSTs.
 * useCountdown itself only guarantees onExpire fires once *from the
 * timer's side*; this ref is what also blocks the *manual* button once
 * the timer has already fired, and vice versa. (The server enforces the
 * same "only once" property independently too — see submitAttempt's own
 * comment on its status check and Result.js's unique index on
 * quizAttempt — this ref is a UX nicety that avoids a pointless duplicate
 * request, not the actual guarantee against a double submission.)
 */
const QuizAttempt = () => {
  const { categoryId, difficulty } = useParams()
  const navigate = useNavigate()

  const [attempt, setAttempt] = useState(null)
  const [questions, setQuestions] = useState(null)
  const [loadError, setLoadError] = useState('')
  // Distinct from submitError below: an expired-or-already-submitted
  // rejection means THIS attempt can never succeed no matter how many
  // times it's retried, so it gets its own terminal screen (same shape
  // as loadError's) rather than leaving the quiz interactive as if
  // trying again might help.
  const [terminalError, setTerminalError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({}) // { [questionId]: 'A'|'B'|'C'|'D' }
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submittingRef = useRef(false)
  // Mirrors `answers` state into a ref so the timer's onExpire (itself
  // stored in a ref inside useCountdown, per that hook's own comment)
  // always submits the *current* answers rather than whatever `answers`
  // was on the render that first passed the callback in.
  const answersRef = useRef(answers)
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const { data } = await api.post('/quiz-attempts', { categoryId, difficulty })
        if (!cancelled) {
          setAttempt(data.attempt)
          setQuestions(data.questions)
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err.response?.data?.error || 'Could not load this quiz. Please try again.'
          )
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [categoryId, difficulty])

  const submit = useCallback(async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setSubmitError('')

    const payload = {
      answers: (questions ?? []).map((q) => ({
        questionId: q._id,
        selectedOption: answersRef.current[q._id] ?? null,
      })),
    }

    try {
      const { data } = await api.post(`/quiz-attempts/${attempt._id}/submit`, payload)
      navigate(`/customer/results/${data.result._id}`, { replace: true })
    } catch (err) {
      submittingRef.current = false
      setSubmitting(false)

      // ATTEMPT_EXPIRED / ATTEMPT_ALREADY_SUBMITTED (see
      // quizAttemptController.js's submitAttempt) — a terminal state for
      // this attempt, not a transient failure worth retrying.
      const code = err.response?.data?.code
      if (code === 'ATTEMPT_EXPIRED' || code === 'ATTEMPT_ALREADY_SUBMITTED') {
        setTerminalError(
          err.response?.data?.error || 'This quiz attempt can no longer be submitted.'
        )
        return
      }

      setSubmitError(err.response?.data?.error || 'Could not submit your quiz. Please try again.')
    }
  }, [attempt, questions, navigate])

  // Seeded once, the instant `attempt` first loads (or resumes) — NOT
  // recomputed on every render, which would restart useCountdown's
  // interval every time this component re-renders (e.g. on every answer
  // selection, since useCountdown's own effect restarts whenever the
  // duration it's given changes — see that hook's comment). `expiresAt`
  // is the server's own clock's word on when this attempt ends;
  // Date.now() here is only this client's best guess at "how many
  // seconds is that from right now", purely to seed what the on-screen
  // timer counts down from — the server enforces the real deadline
  // independently when a submission actually arrives (see this
  // component's own header comment), so nothing security-relevant
  // depends on this being exactly right.
  const initialDurationSeconds = useMemo(() => {
    if (!attempt) return null
    return Math.max(0, Math.round((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000))
  }, [attempt])

  // Timer only starts once the attempt (and its questions) have actually
  // loaded — mounting a countdown before then would start ticking down
  // time the user never got to use.
  const { isWarning, formatted } = useCountdown(initialDurationSeconds, submit)

  if (loadError) {
    return (
      <div className="card empty-state">
        <h3>Couldn't load this quiz</h3>
        <p>{loadError}</p>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/customer/quizzes')}>
          Back to Available Quizzes
        </button>
      </div>
    )
  }

  if (terminalError) {
    return (
      <div className="card empty-state">
        <h3>This quiz can no longer be submitted</h3>
        <p>{terminalError}</p>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/customer/quizzes')}>
          Back to Available Quizzes
        </button>
      </div>
    )
  }

  if (!questions || !attempt) {
    return <p>Loading quiz…</p>
  }

  const currentQuestion = questions[currentIndex]
  const answeredCount = Object.keys(answers).length
  const isLastQuestion = currentIndex === questions.length - 1

  const selectOption = (optionKey) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion._id]: optionKey }))
  }

  const goTo = (index) => {
    if (index >= 0 && index < questions.length) setCurrentIndex(index)
  }

  return (
    <div className="quiz-attempt">
      <div className="quiz-header">
        <div>
          <h1 className="quiz-header-title">{difficulty} Evaluation</h1>
          <p className="quiz-header-meta">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>
        <div
          className={`quiz-timer ${isWarning ? 'quiz-timer--warning' : ''}`}
          role="timer"
          aria-live={isWarning ? 'assertive' : 'off'}
        >
          {formatted()}
        </div>
      </div>

      <div
        className="quiz-progress"
        role="progressbar"
        aria-label="Quiz progress"
        aria-valuenow={currentIndex + 1}
        aria-valuemin={1}
        aria-valuemax={questions.length}
      >
        <div
          className="quiz-progress-fill"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {submitError && (
        <p className="auth-error" role="alert">
          {submitError}
        </p>
      )}

      <div className="quiz-body">
        <div className="card quiz-question-card">
          <h2 className="quiz-question-text">{currentQuestion.question}</h2>

          <fieldset className="quiz-options" disabled={submitting}>
            <legend className="quiz-options-legend">Choose one answer</legend>
            {ANSWER_KEYS.map((key) => {
              const optionText = currentQuestion[`option_${key.toLowerCase()}`]
              const inputId = `q-${currentQuestion._id}-${key}`
              return (
                <label key={key} htmlFor={inputId} className="quiz-option">
                  <input
                    type="radio"
                    id={inputId}
                    name={`question-${currentQuestion._id}`}
                    value={key}
                    checked={answers[currentQuestion._id] === key}
                    onChange={() => selectOption(key)}
                  />
                  <span className="quiz-option-key">{key}</span>
                  <span>{optionText}</span>
                </label>
              )
            })}
          </fieldset>

          <div className="quiz-nav-row">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => goTo(currentIndex - 1)}
              disabled={currentIndex === 0 || submitting}
            >
              ← Previous
            </button>

            {isLastQuestion ? (
              <button
                type="button"
                className="btn btn--success"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit Quiz'}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => goTo(currentIndex + 1)}
                disabled={submitting}
              >
                Next →
              </button>
            )}
          </div>
        </div>

        <aside className="card quiz-map-card">
          <p className="quiz-map-title">
            Question Map <span>{answeredCount}/{questions.length} answered</span>
          </p>
          <div className="quiz-map-grid">
            {questions.map((q, index) => {
              const isAnswered = Boolean(answers[q._id])
              const isCurrent = index === currentIndex
              return (
                <button
                  key={q._id}
                  type="button"
                  className={`quiz-map-cell ${isAnswered ? 'quiz-map-cell--answered' : ''} ${
                    isCurrent ? 'quiz-map-cell--current' : ''
                  }`}
                  onClick={() => goTo(index)}
                  disabled={submitting}
                  aria-current={isCurrent ? 'true' : undefined}
                  aria-label={`Question ${index + 1}${isAnswered ? ', answered' : ', unanswered'}`}
                >
                  {index + 1}
                </button>
              )
            })}
          </div>

          <ul className="quiz-map-legend">
            <li className="quiz-map-legend-item">
              <span className="quiz-map-legend-swatch quiz-map-legend-swatch--answered" aria-hidden="true" />
              Answered
            </li>
            <li className="quiz-map-legend-item">
              <span className="quiz-map-legend-swatch quiz-map-legend-swatch--current" aria-hidden="true" />
              Current
            </li>
            <li className="quiz-map-legend-item">
              <span className="quiz-map-legend-swatch" aria-hidden="true" />
              Unanswered
            </li>
          </ul>

          <button
            type="button"
            className="btn btn--danger-ghost btn--full"
            style={{ marginTop: 16 }}
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit Now'}
          </button>
        </aside>
      </div>
    </div>
  )
}

export default QuizAttempt

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { DIFFICULTY_ORDER, TIME_LIMIT_SECONDS } from './quizConfig'
import './Customer.css'

const DIFFICULTY_TONE = { Easy: 'easy', Medium: 'medium', Hard: 'hard' }

/**
 * "Available Quizzes" — one card per Category (from GET /api/categories,
 * the same public endpoint the eventual public homepage will use — see
 * that route's own comment in categoryRoutes.js), each offering
 * Easy/Medium/Hard as separate start buttons rather than a single
 * "Start Quiz" button with a difficulty dropdown. Matches how
 * getRandomQuestions is actually shaped server-side: difficulty is a
 * required query param that changes *which* question pool gets sampled,
 * not a setting applied after starting — so picking it is the same click
 * as starting, rather than two steps.
 *
 * Starting a quiz navigates to /customer/quiz/:categoryId/:difficulty
 * with no attempt state fetched or created here — QuizAttempt.jsx owns
 * creating (or resuming) the actual server-side QuizAttempt itself, via
 * POST /api/quiz-attempts on mount (see quizAttemptController.js's
 * startOrResumeAttempt — this replaced the old
 * GET /api/questions/random/:categoryId as part of the
 * "no server-side quiz attempt" security fix), so a category card never
 * needs to know question counts or pre-warm anything.
 */
const QuizList = () => {
  const navigate = useNavigate()
  const [categories, setCategories] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const { data } = await api.get('/categories')
        if (!cancelled) setCategories(data.categories)
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Could not load quiz categories.')
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const startQuiz = (categoryId, difficulty) => {
    navigate(`/customer/quiz/${categoryId}/${difficulty}`)
  }

  const loading = categories === null && !error

  return (
    <div>
      <div className="customer-page-header">
        <h1>Available Quizzes</h1>
        <p>Pick a category and difficulty to begin.</p>
      </div>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      {loading && <p>Loading categories…</p>}

      {!loading && categories?.length === 0 && (
        <div className="empty-state card">
          <h3>No categories yet</h3>
          <p>Check back once an admin has added some quiz categories.</p>
        </div>
      )}

      <div className="customer-grid customer-grid--cards">
        {categories?.map((cat) => (
          <div key={cat._id} className="card">
            <h2 style={{ fontSize: '1.05rem', marginBottom: 6 }}>{cat.category_name}</h2>
            <p style={{ color: 'var(--color-ink-soft)', fontSize: '0.9rem', margin: '0 0 16px' }}>
              {cat.description}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DIFFICULTY_ORDER.map((difficulty) => (
                <button
                  key={difficulty}
                  type="button"
                  className="btn btn--ghost btn--full"
                  onClick={() => startQuiz(cat._id, difficulty)}
                  style={{ justifyContent: 'space-between' }}
                >
                  <span className={`status-pill status-pill--${DIFFICULTY_TONE[difficulty]}`}>
                    {difficulty}
                  </span>
                  <span style={{ color: 'var(--color-ink-soft)', fontSize: '0.82rem' }}>
                    {Math.round(TIME_LIMIT_SECONDS[difficulty] / 60)} min · Start →
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default QuizList

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import { DIFFICULTY_ORDER } from './quizConfig'
import './Customer.css'

const DIFFICULTY_INFO = {
  Easy: {
    tier: 'Tier 1',
    description: 'Core fundamentals and basic concepts.',
    tone: 'easy',
  },
  Medium: {
    tier: 'Tier 2',
    description: 'Intermediate logic and practical application.',
    tone: 'medium',
  },
  Hard: {
    tier: 'Tier 3',
    description: 'Advanced scenarios and expert problem solving.',
    tone: 'hard',
  },
}

const QuizDifficulty = () => {
  const { categoryId } = useParams()
  const navigate = useNavigate()

  const [category, setCategory] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadCategory = async () => {
      try {
        const { data } = await api.get('/categories')

        const foundCategory = data.categories?.find(
          (item) => item._id === categoryId
        )

        if (!foundCategory) {
          if (!cancelled) {
            setError('The selected category could not be found.')
          }
          return
        }

        if (!cancelled) {
          setCategory(foundCategory)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.error ||
              'Could not load the selected category.'
          )
        }
      }
    }

    loadCategory()

    return () => {
      cancelled = true
    }
  }, [categoryId])

  const selectDifficulty = (difficulty) => {
    navigate(`/customer/quiz/${categoryId}/${difficulty}`)
  }

  if (error) {
    return (
      <div className="card empty-state">
        <h3>Category unavailable</h3>
        <p>{error}</p>

        <button
          type="button"
          className="btn btn--primary"
          onClick={() => navigate('/customer/quizzes')}
        >
          Back to Available Quizzes
        </button>
      </div>
    )
  }

  if (!category) {
    return <p>Loading difficulty options…</p>
  }

  return (
    <div>
      <div
        className="card"
        style={{
          maxWidth: 720,
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--color-brand)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          Certification Exam
        </p>

        <h1
          style={{
            margin: '10px 0 12px',
            fontSize: '2rem',
          }}
        >
          {category.category_name}
        </h1>

        <p
          style={{
            color: 'var(--color-ink-soft)',
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Select your preferred evaluation tier. Each test consists
          of 10 targeted questions with a strict time limit.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginTop: 32,
          }}
        >
          {DIFFICULTY_ORDER.map((difficulty) => {
            const info = DIFFICULTY_INFO[difficulty]

            return (
              <button
                key={difficulty}
                type="button"
                className="card"
                onClick={() => selectDifficulty(difficulty)}
                style={{
                  cursor: 'pointer',
                  textAlign: 'center',
                  padding: '28px 18px',
                  border: '2px solid var(--color-border)',
                  background: 'var(--color-surface)',
                }}
              >
                <span
                  className={`status-pill status-pill--${info.tone}`}
                  style={{ marginBottom: 14 }}
                >
                  {info.tier}
                </span>

                <h2
                  style={{
                    margin: '0 0 10px',
                    fontSize: '1.2rem',
                    color: 'var(--color-ink)',
                  }}
                >
                  {difficulty}
                </h2>

                <p
                  style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    color: 'var(--color-ink-soft)',
                  }}
                >
                  {info.description}
                </p>
              </button>
            )
          })}
        </div>

        <div style={{ marginTop: 32 }}>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => navigate('/customer/quizzes')}
          >
            ← Back to Available Quizzes
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuizDifficulty
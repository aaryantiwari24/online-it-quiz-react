import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import './Customer.css'

const QuizList = () => {
  const navigate = useNavigate()
  const [categories, setCategories] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const { data } = await api.get('/categories')

        if (!cancelled) {
          setCategories(data.categories)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.error ||
              'Could not load quiz categories.'
          )
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const selectCategory = (categoryId) => {
    navigate(`/customer/quiz-difficulty/${categoryId}`)
  }

  const loading = categories === null && !error

  return (
    <div>
      <div className="customer-page-header">
        <h1>Available Quizzes</h1>
        <p>Select a category to choose your difficulty.</p>
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
          <p>
            Check back once an admin has added some quiz categories.
          </p>
        </div>
      )}

      <div className="customer-grid customer-grid--cards">
        {categories?.map((category) => (
          <div key={category._id} className="card">
            <h2
              style={{
                fontSize: '1.05rem',
                marginBottom: 6,
              }}
            >
              {category.category_name}
            </h2>

            <p
              style={{
                color: 'var(--color-ink-soft)',
                fontSize: '0.9rem',
                margin: '0 0 16px',
              }}
            >
              {category.description || 'Test your knowledge in this category.'}
            </p>

            <button
              type="button"
              className="btn btn--primary btn--full"
              onClick={() => selectCategory(category._id)}
            >
              Select Category →
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default QuizList
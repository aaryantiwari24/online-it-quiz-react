import { useEffect, useState } from 'react'

import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

import './Supplier.css'

const DIFFICULTIES = ['Easy', 'Medium', 'Hard']

const truncate = (text, max = 70) => {
  if (!text) return ''

  return text.length > max
    ? `${text.slice(0, max).trimEnd()}...`
    : text
}

const DashboardOverview = () => {
  const { user } = useAuth()

  const [categories, setCategories] = useState([])
  const [myQuestions, setMyQuestions] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadDashboard = async () => {
      try {
        setError('')

        const { data: categoriesData } =
          await api.get('/categories')

        const categoryList =
          categoriesData.categories || []

        if (cancelled) return

        setCategories(categoryList)

        const questionsByCategory =
          await Promise.all(
            categoryList.map(async (category) => {
              const { data } =
                await api.get(
                  `/questions/category/${category._id}`
                )

              return (data.questions || []).map(
                (question) => ({
                  ...question,

                  categoryId:
                    category._id,

                  categoryName:
                    category.category_name,
                })
              )
            })
          )

        if (cancelled) return

        const questions =
          questionsByCategory
            .flat()
            .filter(
              (question) =>
                question.createdBy?._id ===
                user?.id
            )

        setMyQuestions(questions)
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.error ||
              err.response?.data?.message ||
              'Could not load your dashboard.'
          )

          setMyQuestions([])
        }
      }
    }

    if (user?.id) {
      loadDashboard()
    }

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const questions =
    myQuestions || []

  /*
   * Same metrics as PHP:
   *
   * SELECT COUNT(*) FROM question
   * WHERE supplier_id = current supplier
   */
  const totalQuestions =
    questions.length

  /*
   * Same idea as PHP:
   *
   * COUNT(DISTINCT category_id)
   */
  const totalCategories =
    new Set(
      questions.map(
        (question) =>
          question.categoryId
      )
    ).size

  /*
   * Build category progress exactly like PHP:
   *
   * Easy   -> number / 10
   * Medium -> number / 10
   * Hard   -> number / 10
   *
   * A category is Complete only when
   * all three difficulty levels have
   * at least 10 questions.
   */
  const categoryProgress =
    categories
      .map((category) => {
        const categoryQuestions =
          questions.filter(
            (question) =>
              question.categoryId ===
              category._id
          )

        const counts = {
          Easy: 0,
          Medium: 0,
          Hard: 0,
        }

        categoryQuestions.forEach(
          (question) => {
            if (
              DIFFICULTIES.includes(
                question.difficulty
              )
            ) {
              counts[
                question.difficulty
              ] += 1
            }
          }
        )

        return {
          id: category._id,
          name: category.category_name,
          easy: counts.Easy,
          medium: counts.Medium,
          hard: counts.Hard,
          complete:
            counts.Easy >= 10 &&
            counts.Medium >= 10 &&
            counts.Hard >= 10,
        }
      })
      .filter(
        (category) =>
          category.easy > 0 ||
          category.medium > 0 ||
          category.hard > 0
      )

  /*
   * Same as PHP:
   *
   * ORDER BY question_id DESC
   * LIMIT 5
   *
   * Mongo uses createdAt here because
   * question documents do not have the
   * PHP numeric question_id.
   */
  const recentQuestions =
    [...questions]
      .sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      )
      .slice(0, 5)

  if (myQuestions === null) {
    return (
      <div>
        <div className="supplier-page-header">
          <div>
            <h1>
              Instructor Overview
            </h1>

            <p>
              Loading your dashboard...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="supplier-page-header">
        <div>
          <h1>
            Instructor Overview
          </h1>

          <p>
            Welcome back,{' '}
            <strong>
              {user?.name ||
                'Instructor'}
            </strong>
          </p>
        </div>

        <div
          style={{
            background:
              'var(--color-surface)',
            border:
              '1px solid var(--color-border)',
            borderRadius:
              '999px',
            padding:
              '10px 18px',
            fontWeight: 600,
          }}
        >
          👤{' '}
          {user?.name ||
            'Instructor'}
        </div>
      </div>

      {error && (
        <p
          className="supplier-inline-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* =========================
          METRICS
         ========================= */}

      <div
        className="supplier-grid supplier-grid--stats"
        style={{
          marginBottom: 28,
        }}
      >
        <div className="card">
          <p className="supplier-stat-label">
            My Total Questions
          </p>

          <p className="supplier-stat-value">
            {totalQuestions}
          </p>
        </div>

        <div className="card">
          <p className="supplier-stat-label">
            Categories Covered
          </p>

          <p className="supplier-stat-value">
            {totalCategories}
          </p>
        </div>
      </div>

      {/* =========================
          CATEGORY PROGRESS
         ========================= */}

      <div
        className="card"
        style={{
          marginBottom: 28,
        }}
      >
        <h2
          style={{
            fontSize: '1.1rem',
            margin: 0,
            marginBottom: 8,
          }}
        >
          Category Progress & Readiness
        </h2>

        <p
          style={{
            color:
              'var(--color-ink-soft)',
            fontSize:
              '0.85rem',
            marginTop: 0,
            marginBottom: 20,
          }}
        >
          A category is dynamically
          marked as &quot;Complete&quot;
          when you provide at least
          10 questions per difficulty
          tier.
        </p>

        <div
          style={{
            width: '100%',
            overflowX: 'auto',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse:
                'collapse',
              textAlign: 'left',
              fontSize:
                '0.9rem',
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    padding:
                      '12px 14px',
                    borderBottom:
                      '1px solid var(--color-border)',
                  }}
                >
                  Category
                </th>

                <th
                  style={{
                    padding:
                      '12px 14px',
                    borderBottom:
                      '1px solid var(--color-border)',
                  }}
                >
                  Easy
                </th>

                <th
                  style={{
                    padding:
                      '12px 14px',
                    borderBottom:
                      '1px solid var(--color-border)',
                  }}
                >
                  Medium
                </th>

                <th
                  style={{
                    padding:
                      '12px 14px',
                    borderBottom:
                      '1px solid var(--color-border)',
                  }}
                >
                  Hard
                </th>

                <th
                  style={{
                    padding:
                      '12px 14px',
                    borderBottom:
                      '1px solid var(--color-border)',
                  }}
                >
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {categoryProgress.length ===
              0 ? (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      textAlign:
                        'center',
                      padding:
                        '40px 20px',
                      color:
                        'var(--color-ink-soft)',
                    }}
                  >
                    No category progress
                    found yet.
                  </td>
                </tr>
              ) : (
                categoryProgress.map(
                  (category) => (
                    <tr
                      key={
                        category.id
                      }
                    >
                      <td
                        style={{
                          padding:
                            '14px',
                          borderBottom:
                            '1px solid var(--color-border)',
                          fontWeight: 700,
                        }}
                      >
                        {
                          category.name
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            '14px',
                          borderBottom:
                            '1px solid var(--color-border)',
                        }}
                      >
                        {
                          category.easy
                        }
                        /10
                      </td>

                      <td
                        style={{
                          padding:
                            '14px',
                          borderBottom:
                            '1px solid var(--color-border)',
                        }}
                      >
                        {
                          category.medium
                        }
                        /10
                      </td>

                      <td
                        style={{
                          padding:
                            '14px',
                          borderBottom:
                            '1px solid var(--color-border)',
                        }}
                      >
                        {
                          category.hard
                        }
                        /10
                      </td>

                      <td
                        style={{
                          padding:
                            '14px',
                          borderBottom:
                            '1px solid var(--color-border)',
                        }}
                      >
                        <span
                          style={{
                            display:
                              'inline-block',
                            padding:
                              '6px 12px',
                            borderRadius:
                              '20px',
                            fontSize:
                              '0.75rem',
                            fontWeight: 700,

                            background:
                              category.complete
                                ? 'rgba(24, 183, 122, 0.15)'
                                : 'rgba(255, 107, 74, 0.15)',

                            color:
                              category.complete
                                ? 'var(--accent-green)'
                                : 'var(--accent-coral)',
                          }}
                        >
                          {category.complete
                            ? 'Complete'
                            : 'Incomplete'}
                        </span>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================
          RECENT QUESTIONS
         ========================= */}

      <div className="card">
        <h2
          style={{
            fontSize: '1.1rem',
            margin: 0,
            marginBottom: 20,
          }}
        >
          Recently Added Questions
        </h2>

        <div
          style={{
            width: '100%',
            overflowX: 'auto',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse:
                'collapse',
              textAlign: 'left',
              fontSize:
                '0.9rem',
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    padding:
                      '12px 14px',
                    borderBottom:
                      '1px solid var(--color-border)',
                  }}
                >
                  ID
                </th>

                <th
                  style={{
                    padding:
                      '12px 14px',
                    borderBottom:
                      '1px solid var(--color-border)',
                  }}
                >
                  Category
                </th>

                <th
                  style={{
                    padding:
                      '12px 14px',
                    borderBottom:
                      '1px solid var(--color-border)',
                  }}
                >
                  Question
                </th>

                <th
                  style={{
                    padding:
                      '12px 14px',
                    borderBottom:
                      '1px solid var(--color-border)',
                  }}
                >
                  Difficulty
                </th>
              </tr>
            </thead>

            <tbody>
              {recentQuestions.length ===
              0 ? (
                <tr>
                  <td
                    colSpan="4"
                    style={{
                      textAlign:
                        'center',
                      padding:
                        '40px 20px',
                      color:
                        'var(--color-ink-soft)',
                    }}
                  >
                    No questions added
                    yet. Start by visiting
                    Manage Questions!
                  </td>
                </tr>
              ) : (
                recentQuestions.map(
                  (question) => (
                    <tr
                      key={
                        question._id
                      }
                    >
                      <td
                        style={{
                          padding:
                            '14px',
                          borderBottom:
                            '1px solid var(--color-border)',
                          fontFamily:
                            'var(--font-mono)',
                          fontSize:
                            '0.8rem',
                        }}
                      >
                        #
                        {question._id}
                      </td>

                      <td
                        style={{
                          padding:
                            '14px',
                          borderBottom:
                            '1px solid var(--color-border)',
                        }}
                      >
                        <span
                          style={{
                            display:
                              'inline-block',
                            padding:
                              '6px 12px',
                            borderRadius:
                              '20px',
                            fontSize:
                              '0.75rem',
                            fontWeight: 700,
                            background:
                              'rgba(81, 70, 229, 0.10)',
                            color:
                              'var(--brand-primary)',
                          }}
                        >
                          {
                            question.categoryName ||
                            'General'
                          }
                        </span>
                      </td>

                      <td
                        style={{
                          padding:
                            '14px',
                          borderBottom:
                            '1px solid var(--color-border)',
                        }}
                      >
                        {truncate(
                          question.question
                        )}
                      </td>

                      <td
                        style={{
                          padding:
                            '14px',
                          borderBottom:
                            '1px solid var(--color-border)',
                          fontWeight: 700,
                        }}
                      >
                        {
                          question.difficulty ||
                          'Standard'
                        }
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default DashboardOverview
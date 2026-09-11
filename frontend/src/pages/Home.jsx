import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import './Home.css'

const ROLE_HOME = {
  admin: '/admin',
  supplier: '/supplier',
  customer: '/customer',
}

const HOW_IT_WORKS_STEPS = [
  {
    n: '01',
    title: 'Choose Topic',
    copy: "Pick a category and a difficulty tier that matches where you're at.",
  },
  {
    n: '02',
    title: 'Answer',
    copy: 'Work through 10 questions against the clock.',
  },
  {
    n: '03',
    title: 'Score',
    copy: 'Get graded instantly the moment you submit.',
  },
  {
    n: '04',
    title: 'Certify',
    copy: 'Score 60% or higher and a verifiable credential is generated automatically.',
  },
]

const DIFFICULTY_TIERS = [
  {
    tone: 'easy',
    pill: 'Easy',
    label: 'Foundations',
    copy: 'Core definitions and basic syntax.',
  },
  {
    tone: 'medium',
    pill: 'Medium',
    label: 'Application',
    copy: 'Contextual knowledge and everyday debugging.',
  },
  {
    tone: 'hard',
    pill: 'Hard',
    label: 'Expertise',
    copy: 'Edge cases and advanced logic.',
  },
]

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  const primaryCtaTarget = isAuthenticated
    ? ROLE_HOME[user.role] ?? '/'
    : '/register'

  const primaryCtaLabel = isAuthenticated
    ? 'Go to Dashboard'
    : 'Register to Start'

  const handleLogout = () => {
    logout()
    closeMenu()
    navigate('/')
  }

  return (
    <header className="home-navbar">
      <div className="home-navbar-inner">
        <Link to="/" className="home-navbar-brand">
          IT Quiz
        </Link>

        <nav
          className={`home-nav-links ${
            menuOpen ? 'home-nav-links--open' : ''
          }`}
          aria-label="Primary"
        >
          <a href="#categories" onClick={closeMenu}>
            Explore
          </a>

          <a href="#how-it-works" onClick={closeMenu}>
            How it Works
          </a>

          <Link to="/faq" onClick={closeMenu}>
            FAQ
          </Link>

          {/* Supplier Login */}
          <Link
            to="/login?role=supplier"
            onClick={closeMenu}
          >
            Supplier
          </Link>

          {/* Admin Login */}
          <Link
            to="/login?role=admin"
            onClick={closeMenu}
          >
            Admin
          </Link>

          {isAuthenticated ? (
            <span className="home-nav-account">
              <span className="home-nav-hello">
                Hi, {user.name.split(' ')[0]}
              </span>

              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </span>
          ) : (
            <Link
              to="/login?role=customer"
              onClick={closeMenu}
            >
              Log in
            </Link>
          )}
        </nav>

        <div className="home-navbar-actions">
          <Link
            to={primaryCtaTarget}
            className="btn btn--primary btn--sm"
          >
            {primaryCtaLabel}
          </Link>

          <button
            type="button"
            className="home-nav-toggle"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  const { isAuthenticated, user } = useAuth()

  const primaryCtaTarget = isAuthenticated
    ? ROLE_HOME[user.role] ?? '/'
    : '/register'

  const primaryCtaLabel = isAuthenticated
    ? 'Go to Dashboard'
    : 'Register to Start'

  return (
    <section className="home-hero">
      <div className="home-hero-copy">
        <h1 className="home-hero-heading">
          Test Your IT Knowledge.
          <br />
          <span className="home-hero-heading-accent">
            Prove Your Skills.
          </span>
        </h1>

        <p className="home-hero-subtext">
          A focused certification environment — pick a topic,
          answer real questions against the clock, and walk away
          with a credential that proves what you know.
        </p>

        <div className="home-hero-ctas">
          <Link
            to={primaryCtaTarget}
            className="btn btn--primary"
          >
            {primaryCtaLabel}
          </Link>

          <a
            href="#categories"
            className="home-hero-secondary-cta"
          >
            Explore Quizzes
          </a>
        </div>
      </div>

      <div
        className="home-hero-visual"
        aria-hidden="true"
      >
        <div className="home-hero-quiz-card">
          <div className="home-hero-quiz-card-top">
            <span className="home-hero-quiz-card-label">
              Certification Evaluation
            </span>

            <span className="home-hero-quiz-card-timer">
              11:42
            </span>
          </div>

          <div className="home-hero-quiz-card-progress">
            <div className="home-hero-quiz-card-progress-fill" />
          </div>

          <p className="home-hero-quiz-card-question">
            Which array method builds a new array by transforming
            every element?
          </p>

          <div className="home-hero-quiz-card-options">
            <div className="home-hero-quiz-card-option home-hero-quiz-card-option--selected">
              map()
            </div>

            <div className="home-hero-quiz-card-option">
              filter()
            </div>

            <div className="home-hero-quiz-card-option">
              forEach()
            </div>

            <div className="home-hero-quiz-card-option">
              reduce()
            </div>
          </div>
        </div>

        <div className="home-hero-toast-card">
          🎉 Score: 92% — Certificate Earned
        </div>
      </div>
    </section>
  )
}

function CategoriesSection() {
  const { isAuthenticated, user } = useAuth()

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
              'Could not load categories.'
          )
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const loading = categories === null && !error

  const startQuizTarget =
    isAuthenticated && user?.role === 'customer'
      ? '/customer/quizzes'
      : '/register'

  return (
    <section
      id="categories"
      className="home-section"
    >
      <div className="home-section-header">
        <h2>Explore IT Categories</h2>

        <p>
          Real questions, pulled from our growing question bank.
        </p>
      </div>

      {error && (
        <p
          className="home-inline-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {loading && <p>Loading categories…</p>}

      {!loading && categories?.length === 0 && (
        <div className="empty-state card">
          <h3>No categories yet</h3>
          <p>Check back soon.</p>
        </div>
      )}

      {categories?.length > 0 && (
        <div className="home-grid home-grid--categories">
          {categories.map((cat) => (
            <div
              key={cat._id}
              className="card home-category-card"
            >
              <div className="home-category-badge">
                {cat.category_name
                  .slice(0, 2)
                  .toUpperCase()}
              </div>

              <h3>{cat.category_name}</h3>

              <p>{cat.description}</p>

              <Link
                to={startQuizTarget}
                className="home-category-link"
              >
                Start Quiz →
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="home-section"
    >
      <div className="home-section-header">
        <h2>How it Works</h2>

        <p>
          Four steps from picking a topic to holding a credential.
        </p>
      </div>

      <div className="home-grid home-grid--steps">
        {HOW_IT_WORKS_STEPS.map((step) => (
          <div
            key={step.n}
            className="card home-step-card"
          >
            <span className="home-step-number">
              {step.n}
            </span>

            <h3>{step.title}</h3>

            <p>{step.copy}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function DifficultySection() {
  return (
    <section className="home-section">
      <div className="home-section-header">
        <h2>Structured Difficulty</h2>

        <p>
          Every question bank spans three tiers, from first
          principles to edge cases.
        </p>
      </div>

      <div className="home-grid home-grid--tiers">
        {DIFFICULTY_TIERS.map((tier) => (
          <div
            key={tier.tone}
            className="card home-tier-card"
          >
            <span
              className={`home-tier-badge home-tier-badge--${tier.tone}`}
            >
              {tier.pill}
            </span>

            <h3>{tier.label}</h3>

            <p>{tier.copy}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function StatsSection() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const { data } = await api.get('/stats')

        if (!cancelled) {
          setStats(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.error ||
              'Could not load stats.'
          )
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const loading = stats === null && !error

  const items = stats
    ? [
        {
          label: 'Live Questions',
          value: stats.liveQuestions,
        },
        {
          label: 'Quizzes Taken',
          value: stats.quizzesTaken,
        },
        {
          label: 'Difficulty Tiers',
          value: stats.difficultyTiers,
        },
        {
          label: 'Certificates Earned',
          value: stats.certificatesEarned,
        },
      ]
    : []

  return (
    <section className="home-section">
      {error && (
        <p
          className="home-inline-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p>Loading stats…</p>
      ) : (
        <div className="home-grid home-grid--stats">
          {items.map((item) => (
            <div
              key={item.label}
              className="card home-stat-card"
            >
              <p className="home-stat-label">
                {item.label}
              </p>

              <p className="home-stat-value">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function CertificatePreviewSection() {
  const { isAuthenticated, user } = useAuth()

  const primaryCtaTarget = isAuthenticated
    ? ROLE_HOME[user.role] ?? '/'
    : '/register'

  const primaryCtaLabel = isAuthenticated
    ? 'Go to Dashboard'
    : 'Register to Start'

  return (
    <section className="home-section">
      <div className="home-section-header">
        <h2>Every Pass Earns a Certificate</h2>

        <p>
          Score 60% or higher and a verified credential is
          generated automatically — yours to download and share.
        </p>
      </div>

      <div
        className="card home-cert-preview"
        aria-hidden="true"
      >
        <p className="home-cert-eyebrow">
          Certificate of Completion
        </p>

        <h3 className="home-cert-title">
          IT Quiz
        </h3>

        <p className="home-cert-subtitle">
          Verified Professional Credential
        </p>

        <p className="home-cert-label">
          This certifies that
        </p>

        <p className="home-cert-recipient">
          Alex Morgan
        </p>

        <div className="home-cert-divider" />

        <p className="home-cert-body">
          has successfully completed the official{' '}
          <strong>Application</strong> certification
          evaluation in <strong>PHP</strong>, achieving
          a score of <strong>92%</strong>.
        </p>

        <div className="home-cert-meta-row">
          <div>
            <p className="home-cert-meta-label">
              Certificate No.
            </p>

            <p className="home-cert-meta-value">
              ITQ-2026-A1B2C3D4E5F6
            </p>
          </div>

          <div>
            <p className="home-cert-meta-label">
              Issued
            </p>

            <p className="home-cert-meta-value">
              1/15/2026
            </p>
          </div>
        </div>
      </div>

      <div className="home-cert-cta">
        <Link
          to={primaryCtaTarget}
          className="btn btn--primary"
        >
          {primaryCtaLabel}
        </Link>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="home-footer">
      <p>
        © {new Date().getFullYear()} IT Quiz
      </p>
    </footer>
  )
}

const Home = () => {
  return (
    <div className="home-page">
      <Navbar />

      <main>
        <Hero />
        <CategoriesSection />
        <HowItWorksSection />
        <DifficultySection />
        <StatsSection />
        <CertificatePreviewSection />
      </main>

      <Footer />
    </div>
  )
}

export default Home
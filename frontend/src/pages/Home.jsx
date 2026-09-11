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
    copy:
      'Select a specific IT category and difficulty tier that matches your current skill level.',
  },
  {
    n: '02',
    title: 'Answer',
    copy:
      'Complete a dynamically generated 10-question evaluation under a strict time limit.',
  },
  {
    n: '03',
    title: 'Score',
    copy:
      'Get instant grading, detailed feedback, and review correct answers immediately.',
  },
  {
    n: '04',
    title: 'Certify',
    copy:
      'Pass the 60% threshold to automatically generate a verifiable digital credential.',
  },
]

const DIFFICULTY_TIERS = [
  {
    tone: 'easy',
    pill: 'Easy',
    label: 'Foundations',
    copy:
      'Start building confidence. Focuses on core definitions, basic syntax, and introductory concepts.',
  },
  {
    tone: 'medium',
    pill: 'Medium',
    label: 'Application',
    copy:
      'Push your understanding. Requires contextual knowledge, debugging, and mid-level logic.',
  },
  {
    tone: 'hard',
    pill: 'Hard',
    label: 'Expertise',
    copy:
      'Prove your expertise. Features complex edge cases, advanced algorithms, and system analysis.',
  },
]

/*
 * FAQ is intentionally static.
 * It is NOT connected to MongoDB or any backend API.
 */
const FAQS = [
  {
    question: 'How many questions are in each quiz?',
    answer:
      'Each quiz contains 10 questions selected from the category and difficulty level you choose.',
  },
  {
    question: 'How much time do I get to complete a quiz?',
    answer:
      'You have 10 minutes to complete a quiz.',
  },
  {
    question: 'What difficulty levels are available?',
    answer:
      'There are three difficulty levels: Easy, Medium, and Hard.',
  },
  {
    question: 'What score do I need to pass?',
    answer:
      'You need a score of 60% or higher to pass the evaluation and earn a certificate.',
  },
  {
    question: 'Are quiz questions selected randomly?',
    answer:
      'Yes. Questions are dynamically selected from the available question bank for the category and difficulty you choose.',
  },
  {
    question: 'Can I see my results after completing a quiz?',
    answer:
      'Yes. Your score, percentage, status, and attempt information are available from your customer dashboard.',
  },
  {
    question: 'Do I receive a certificate after passing?',
    answer:
      'Yes. Passing an evaluation with at least 60% automatically generates a certificate of completion.',
  },
  {
    question: 'Can suppliers add questions?',
    answer:
      'Yes. Suppliers can add, update, and delete questions through the supplier portal.',
  },
  {
    question: 'Do I need an account to take a quiz?',
    answer:
      'Yes. You need to register and log in as a customer before attempting a quiz.',
  },
  {
    question: 'Can I update my profile information?',
    answer:
      'Yes. You can update your profile information from your account settings.',
  },
]

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => {
    setMenuOpen(false)
  }

  const primaryCtaTarget = isAuthenticated
    ? ROLE_HOME[user?.role] ?? '/'
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

        <Link
          to="/"
          className="home-navbar-brand"
          onClick={closeMenu}
        >
          <span className="home-navbar-brand-icon">
            ✓
          </span>

          IT Quiz
        </Link>

        <nav
          className={`home-nav-links ${
            menuOpen ? 'home-nav-links--open' : ''
          }`}
          aria-label="Primary"
        >
          <a
            href="#categories"
            onClick={closeMenu}
          >
            Explore
          </a>

          <a
            href="#how-it-works"
            onClick={closeMenu}
          >
            How it Works
          </a>

          <a
            href="#faq"
            onClick={closeMenu}
          >
            FAQ
          </a>

          {!isAuthenticated && (
            <>
              <Link
                to="/login?role=supplier"
                onClick={closeMenu}
              >
                Supplier
              </Link>

              <Link
                to="/login?role=admin"
                onClick={closeMenu}
              >
                Admin
              </Link>

              <Link
                to="/login?role=customer"
                onClick={closeMenu}
              >
                Log in
              </Link>
            </>
          )}

          {isAuthenticated && (
            <span className="home-nav-account">
              <span className="home-nav-hello">
                Hi, {user?.name?.split(' ')[0] || 'User'}
              </span>

              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </span>
          )}
        </nav>

        <div className="home-navbar-actions">
          <Link
            to={primaryCtaTarget}
            className="btn btn--primary btn--sm"
            onClick={closeMenu}
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
    ? ROLE_HOME[user?.role] ?? '/'
    : '/register'

  const primaryCtaLabel = isAuthenticated
    ? 'Explore Categories'
    : 'Register to Start'

  return (
    <section className="home-hero">

      <div className="home-hero-copy">

        <p className="home-hero-eyebrow">
          Online IT Quiz Platform
        </p>

        <h1 className="home-hero-heading">
          Test Your IT
          <br />
          Knowledge.
          <br />
          <span className="home-hero-heading-accent">
            Prove Your Skills.
          </span>
        </h1>

        <p className="home-hero-subtext">
          Join our premium certification environment. Take dynamically
          generated evaluations, track your performance, and earn verified
          credentials.
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

        <svg
          className="home-hero-path"
          viewBox="0 0 520 360"
          fill="none"
        >
          <path
            d="M35 310 C110 270 75 180 165 160 C250 140 260 245 350 205 C425 172 420 70 500 45"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="8 8"
          />

          <circle
            className="home-hero-moving-dot"
            cx="35"
            cy="310"
            r="6"
          />
        </svg>

        <div className="home-hero-floating-timer">
          <span className="home-hero-floating-label">
            Time Remaining
          </span>

          <strong>
            12:45
          </strong>
        </div>

        <div className="home-hero-quiz-card">

          <div className="home-hero-quiz-card-top">

            <span className="home-hero-quiz-card-label">
              JAVASCRIPT
            </span>

            <span className="home-hero-quiz-card-progress-text">
              07 / 20
            </span>

          </div>

          <p className="home-hero-quiz-card-question">
            What does a JavaScript function return by default?
          </p>

          <div className="home-hero-quiz-card-options">

            <div className="home-hero-quiz-card-option">
              A specific Value
            </div>

            <div className="home-hero-quiz-card-option home-hero-quiz-card-option--selected">
              Undefined
            </div>

            <div className="home-hero-quiz-card-option">
              An Object
            </div>

          </div>

        </div>

        <div className="home-hero-score-card">
          <strong>
            Score: 92%
          </strong>

          <span>
            Certificate Earned
          </span>
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

    const loadCategories = async () => {
      try {
        const { data } = await api.get('/categories')

        if (!cancelled) {
          setCategories(data.categories || [])
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

    loadCategories()

    return () => {
      cancelled = true
    }
  }, [])

  const loading = categories === null && !error

  const startQuizTarget =
    isAuthenticated && user?.role === 'customer'
      ? '/customer/quizzes'
      : '/login?role=customer'

  return (
    <section
      id="categories"
      className="home-section home-categories-section"
    >

      <div className="home-section-header">

        <h2>
          Explore IT Categories
        </h2>

        <p>
          Choose from our curated library of technical domains. Each
          category features dynamically generated questions submitted
          by industry professionals.
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

      {loading && (
        <p className="home-loading">
          Loading categories…
        </p>
      )}

      {!loading && categories?.length === 0 && (
        <div className="empty-state card">
          <h3>
            No categories yet
          </h3>

          <p>
            Check back soon.
          </p>
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
                  ?.slice(0, 2)
                  .toUpperCase()}
              </div>

              <h3>
                {cat.category_name}
              </h3>

              <p>
                {cat.description ||
                  'Explore questions and test your knowledge in this technical domain.'}
              </p>

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

        <h2>
          The Learning Path
        </h2>

        <p>
          A simple, transparent process to validate your skills and build
          your professional profile.
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

            <h3>
              {step.title}
            </h3>

            <p>
              {step.copy}
            </p>

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

        <h2>
          Structured Difficulty
        </h2>

        <p>
          Evaluations are categorized into three distinct tiers, allowing
          you to build confidence or prove mastery.
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

            <h3>
              {tier.label}
            </h3>

            <p>
              {tier.copy}
            </p>

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

    const loadStats = async () => {
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

    loadStats()

    return () => {
      cancelled = true
    }
  }, [])

  const loading = stats === null && !error

  const items = stats
    ? [
        {
          label: 'Live Questions',
          value: stats.liveQuestions ?? 0,
        },
        {
          label: 'Quizzes Taken',
          value: stats.quizzesTaken ?? 0,
        },
        {
          label: 'Difficulty Tiers',
          value: stats.difficultyTiers ?? 3,
        },
        {
          label: 'Certificates Earned',
          value: stats.certificatesEarned ?? 0,
        },
      ]
    : []

  return (
    <section className="home-stats-section">

      {error && (
        <p
          className="home-inline-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="home-loading">
          Loading stats…
        </p>
      ) : (
        <div className="home-stats-strip">

          {items.map((item) => (
            <div
              key={item.label}
              className="home-stat-item"
            >

              <p className="home-stat-value">
                {item.value}
              </p>

              <p className="home-stat-label">
                {item.label}
              </p>

            </div>
          ))}

        </div>
      )}

    </section>
  )
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null)

  const toggleFAQ = (index) => {
    setOpenIndex((current) =>
      current === index ? null : index
    )
  }

  return (
    <section
      id="faq"
      className="home-section home-faq-section"
    >

      <div className="home-section-header">

        <h2>
          Frequently Asked Questions
        </h2>

        <p>
          Find answers to common questions about quizzes, accounts,
          certificates, and the IT Quiz platform.
        </p>

      </div>

      <div className="home-faq-list">

        {FAQS.map((faq, index) => {
          const isOpen = openIndex === index

          return (
            <div
              key={faq.question}
              className={`home-faq-item ${
                isOpen ? 'home-faq-item--open' : ''
              }`}
            >

              <button
                type="button"
                className="home-faq-question"
                onClick={() => toggleFAQ(index)}
                aria-expanded={isOpen}
              >

                <span>
                  {faq.question}
                </span>

                <span className="home-faq-icon">
                  {isOpen ? '−' : '+'}
                </span>

              </button>

              {isOpen && (
                <div className="home-faq-answer">
                  <p>
                    {faq.answer}
                  </p>
                </div>
              )}

            </div>
          )
        })}

      </div>

    </section>
  )
}

function CertificatePreviewSection() {
  const { isAuthenticated, user } = useAuth()

  const primaryCtaTarget = isAuthenticated
    ? ROLE_HOME[user?.role] ?? '/'
    : '/register'

  return (
    <section className="home-section home-certificate-section">

      <div className="home-certificate-content">

        <div className="home-certificate-copy">

          <h2>
            Earn Verified Credentials
          </h2>

          <p>
            Every time you successfully pass an evaluation, the system
            automatically generates a unique Certificate of Completion.
            Keep a record of your progress, download your PDFs, and share
            your validated skills with employers.
          </p>

          {!isAuthenticated && (
            <Link
              to={primaryCtaTarget}
              className="btn btn--primary"
            >
              Start Earning Today
            </Link>
          )}

        </div>

        <div
          className="home-cert-preview"
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
            This is proudly presented to
          </p>

          <p className="home-cert-recipient">
            Student Name
          </p>

          <div className="home-cert-divider" />

          <p className="home-cert-body">
            for successfully passing the official certification
            evaluation with a score of <strong>92%</strong>.
          </p>

          <div className="home-cert-meta-row">

            <div>
              <p className="home-cert-meta-label">
                Issued
              </p>

              <p className="home-cert-meta-value">
                Oct 24, 2024
              </p>
            </div>

            <div className="home-cert-check">
              ✓
            </div>

          </div>

        </div>

      </div>

    </section>
  )
}

export function Footer() {
  return (
    <footer className="home-footer">

      <div className="home-footer-inner">

        <p>
          © {new Date().getFullYear()} IT Quiz
        </p>

        <a href="#faq">
          Frequently Asked Questions
        </a>

      </div>

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
        <FAQSection />
      </main>

      <Footer />

    </div>
  )
}

export default Home
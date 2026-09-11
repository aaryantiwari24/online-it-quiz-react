import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import './Home.css'

// Where "the primary next step" points, given current auth state. Mirrors
// Login.jsx's own ROLE_HOME map — duplicated locally rather than imported,
// matching this codebase's existing preference for small local duplication
// over a shared utils file (see categoryController.js's isValidObjectId
// comment for the same reasoning applied elsewhere).
const ROLE_HOME = { admin: '/admin', supplier: '/supplier', customer: '/customer' }

const HOW_IT_WORKS_STEPS = [
  {
    n: '01',
    title: 'Choose Topic',
    copy: "Pick a category and a difficulty tier that matches where you're at.",
  },
  { n: '02', title: 'Answer', copy: 'Work through 10 questions against the clock.' },
  { n: '03', title: 'Score', copy: 'Get graded instantly the moment you submit.' },
  {
    n: '04',
    title: 'Certify',
    copy: 'Score 60% or higher and a verifiable credential is generated automatically.',
  },
]

const DIFFICULTY_TIERS = [
  { tone: 'easy', pill: 'Easy', label: 'Foundations', copy: 'Core definitions and basic syntax.' },
  {
    tone: 'medium',
    pill: 'Medium',
    label: 'Application',
    copy: 'Contextual knowledge and everyday debugging.',
  },
  { tone: 'hard', pill: 'Hard', label: 'Expertise', copy: 'Edge cases and advanced logic.' },
]

/**
 * Sticky top bar — logo, in-page anchor links, role-aware auth slot, and
 * the shared primary CTA (also reused by Hero below, per
 * PHASE_9_BUILD_PROMPT.md Section 4.1). Below 860px — the same cutover
 * Admin.css/Customer.css use for their own sidebar collapse, kept as one
 * number site-wide rather than a second, homepage-specific breakpoint —
 * the link list collapses behind a toggle button instead.
 *
 * Named export (Phase 10) so pages/FAQ.jsx can render the exact same
 * navbar — same auth-aware CTA, same mobile toggle behavior — instead of
 * a second copy that could drift. `Footer` below is exported for the
 * same reason. `Home` (default export) is unaffected.
 */
export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  const primaryCtaTarget = isAuthenticated ? (ROLE_HOME[user.role] ?? '/') : '/register'
  const primaryCtaLabel = isAuthenticated ? 'Go to Dashboard' : 'Register to Start'

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
          className={`home-nav-links ${menuOpen ? 'home-nav-links--open' : ''}`}
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
          <Link to="/login" onClick={closeMenu}>
            Supplier
          </Link>
          <Link to="/login" onClick={closeMenu}>
            Admin
          </Link>
          {isAuthenticated ? (
            <span className="home-nav-account">
              <span className="home-nav-hello">Hi, {user.name.split(' ')[0]}</span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={handleLogout}>
                Log Out
              </button>
            </span>
          ) : (
            <Link to="/login" onClick={closeMenu}>
              Log in
            </Link>
          )}
        </nav>

        <div className="home-navbar-actions">
          <Link to={primaryCtaTarget} className="btn btn--primary btn--sm">
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

/**
 * Headline + two CTAs on the left, two floating decorative cards on the
 * right. The cards are purely visual — context.md is explicit that the
 * reference build's version of these is "not functional," and they stay
 * that way here: no state, no API calls, no click handlers, nothing
 * ticks or updates (locked decision, PHASE_9_BUILD_PROMPT.md Section 5.5).
 * The mock question reuses one of the actual seeded JavaScript questions
 * verbatim (see backend/scripts/seed.js) rather than inventing content
 * that doesn't exist anywhere in the DB, and the "selected" option
 * mirrors the real quiz screen's selected-option treatment
 * (border-color: brand, background: brand-soft — see Quiz.css) even
 * though this page doesn't import that file.
 */
function Hero() {
  const { isAuthenticated, user } = useAuth()

  const primaryCtaTarget = isAuthenticated ? (ROLE_HOME[user.role] ?? '/') : '/register'
  const primaryCtaLabel = isAuthenticated ? 'Go to Dashboard' : 'Register to Start'

  return (
    <section className="home-hero">
      <div className="home-hero-copy">
        <h1 className="home-hero-heading">
          Test Your IT Knowledge.
          <br />
          <span className="home-hero-heading-accent">Prove Your Skills.</span>
        </h1>
        <p className="home-hero-subtext">
          A focused certification environment — pick a topic, answer real questions against the
          clock, and walk away with a credential that proves what you know.
        </p>
        <div className="home-hero-ctas">
          <Link to={primaryCtaTarget} className="btn btn--primary">
            {primaryCtaLabel}
          </Link>
          <a href="#categories" className="home-hero-secondary-cta">
            Explore Quizzes
          </a>
        </div>
      </div>

      <div className="home-hero-visual" aria-hidden="true">
        <div className="home-hero-quiz-card">
          <div className="home-hero-quiz-card-top">
            <span className="home-hero-quiz-card-label">Certification Evaluation</span>
            <span className="home-hero-quiz-card-timer">11:42</span>
          </div>
          <div className="home-hero-quiz-card-progress">
            <div className="home-hero-quiz-card-progress-fill" />
          </div>
          <p className="home-hero-quiz-card-question">
            Which array method builds a new array by transforming every element?
          </p>
          <div className="home-hero-quiz-card-options">
            <div className="home-hero-quiz-card-option home-hero-quiz-card-option--selected">
              map()
            </div>
            <div className="home-hero-quiz-card-option">filter()</div>
            <div className="home-hero-quiz-card-option">forEach()</div>
            <div className="home-hero-quiz-card-option">reduce()</div>
          </div>
        </div>

        <div className="home-hero-toast-card">🎉 Score: 92% — Certificate Earned</div>
      </div>
    </section>
  )
}

/**
 * Real categories from GET /api/categories — every one returned, not a
 * fixed four. context.md's "Programming / Web Architecture / Database
 * Systems / Cyber Security" were reference-video placeholders; the real
 * DB currently has PHP and JavaScript, and this section grows on its own
 * as an admin adds more via ManageCategories.jsx, no code change needed
 * here.
 */
function CategoriesSection() {
  const { isAuthenticated, user } = useAuth()
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
          setError(err.response?.data?.error || 'Could not load categories.')
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const loading = categories === null && !error
  // Logged-in customers go straight to the real quiz picker (QuizList.jsx
  // handles category+difficulty selection itself); everyone else — logged
  // out, or logged in as admin/supplier browsing the public site — is
  // funneled toward registering. Deliberate simplification for an edge
  // case that barely matters, per PHASE_9_BUILD_PROMPT.md Section 4.9;
  // flagged in PHASE_9_VERIFICATION.md rather than special-cased here.
  const startQuizTarget =
    isAuthenticated && user?.role === 'customer' ? '/customer/quizzes' : '/register'

  return (
    <section id="categories" className="home-section">
      <div className="home-section-header">
        <h2>Explore IT Categories</h2>
        <p>Real questions, pulled from our growing question bank.</p>
      </div>

      {error && (
        <p className="home-inline-error" role="alert">
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
            <div key={cat._id} className="card home-category-card">
              <div className="home-category-badge">
                {cat.category_name.slice(0, 2).toUpperCase()}
              </div>
              <h3>{cat.category_name}</h3>
              <p>{cat.description}</p>
              <Link to={startQuizTarget} className="home-category-link">
                Start Quiz →
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/** Purely static — describes the site's fixed structure, no API call. */
function HowItWorksSection() {
  return (
    <section id="how-it-works" className="home-section">
      <div className="home-section-header">
        <h2>How it Works</h2>
        <p>Four steps from picking a topic to holding a credential.</p>
      </div>
      <div className="home-grid home-grid--steps">
        {HOW_IT_WORKS_STEPS.map((step) => (
          <div key={step.n} className="card home-step-card">
            <span className="home-step-number">{step.n}</span>
            <h3>{step.title}</h3>
            <p>{step.copy}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * Also purely static — the three tiers are a fixed part of the site's
 * structure (the Question/Result difficulty enum), not a count from the
 * DB. The stats strip below is where DB-driven numbers live.
 */
function DifficultySection() {
  return (
    <section className="home-section">
      <div className="home-section-header">
        <h2>Structured Difficulty</h2>
        <p>Every question bank spans three tiers, from first principles to edge cases.</p>
      </div>
      <div className="home-grid home-grid--tiers">
        {DIFFICULTY_TIERS.map((tier) => (
          <div key={tier.tone} className="card home-tier-card">
            <span className={`home-tier-badge home-tier-badge--${tier.tone}`}>{tier.pill}</span>
            <h3>{tier.label}</h3>
            <p>{tier.copy}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * Four aggregate numbers from GET /api/stats — the exact same endpoint
 * and shape admin/DashboardOverview.jsx already calls, so both pages
 * necessarily show matching numbers. That's intentional reuse, not a
 * coincidence to "fix" (see statsController.js's own header comment).
 */
function StatsSection() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const { data } = await api.get('/stats')
        if (!cancelled) setStats(data)
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Could not load stats.')
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
        { label: 'Live Questions', value: stats.liveQuestions },
        { label: 'Quizzes Taken', value: stats.quizzesTaken },
        { label: 'Difficulty Tiers', value: stats.difficultyTiers },
        { label: 'Certificates Earned', value: stats.certificatesEarned },
      ]
    : []

  return (
    <section className="home-section">
      {error && (
        <p className="home-inline-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p>Loading stats…</p>
      ) : (
        <div className="home-grid home-grid--stats">
          {items.map((item) => (
            <div key={item.label} className="card home-stat-card">
              <p className="home-stat-label">{item.label}</p>
              <p className="home-stat-value">{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/**
 * Illustrative, static replica of the real certificate design
 * (pages/customer/Certificate.jsx) — same copy structure and layout
 * language, placeholder values since this page renders before login and
 * makes no API call for this section. Its own markup/CSS rather than an
 * import of Certificate.css, keeping Home.css self-contained (locked
 * decision, PHASE_9_BUILD_PROMPT.md Section 5.7).
 */
function CertificatePreviewSection() {
  const { isAuthenticated, user } = useAuth()
  const primaryCtaTarget = isAuthenticated ? (ROLE_HOME[user.role] ?? '/') : '/register'
  const primaryCtaLabel = isAuthenticated ? 'Go to Dashboard' : 'Register to Start'

  return (
    <section className="home-section">
      <div className="home-section-header">
        <h2>Every Pass Earns a Certificate</h2>
        <p>
          Score 60% or higher and a verified credential is generated automatically — yours to
          download and share.
        </p>
      </div>

      <div className="card home-cert-preview" aria-hidden="true">
        <p className="home-cert-eyebrow">Certificate of Completion</p>
        <h3 className="home-cert-title">IT Quiz</h3>
        <p className="home-cert-subtitle">Verified Professional Credential</p>

        <p className="home-cert-label">This certifies that</p>
        <p className="home-cert-recipient">Alex Morgan</p>

        <div className="home-cert-divider" />

        <p className="home-cert-body">
          has successfully completed the official <strong>Application</strong> certification
          evaluation in <strong>PHP</strong>, achieving a score of <strong>92%</strong>.
        </p>

        <div className="home-cert-meta-row">
          <div>
            <p className="home-cert-meta-label">Certificate No.</p>
            <p className="home-cert-meta-value">ITQ-2026-A1B2C3D4E5F6</p>
          </div>
          <div>
            <p className="home-cert-meta-label">Issued</p>
            <p className="home-cert-meta-value">1/15/2026</p>
          </div>
        </div>
      </div>

      <div className="home-cert-cta">
        <Link to={primaryCtaTarget} className="btn btn--primary">
          {primaryCtaLabel}
        </Link>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="home-footer">
      <p>© {new Date().getFullYear()} IT Quiz</p>
    </footer>
  )
}

/**
 * Public homepage at "/" — context.md Section 2's marketing/landing page,
 * built last among the frontend phases (Phase 9) because it mostly just
 * links into dashboards Phase 6/7/8 already built. Replaces App.jsx's
 * Phase-0 placeholder Home()/AuthNav()/global <nav> — see that file's own
 * comment on the swap.
 */
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

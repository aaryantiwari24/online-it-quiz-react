import { useEffect, useState } from 'react'
import { Navbar, Footer } from './Home'
import api from '../services/api'
import './Home.css'
import './FAQ.css'

/**
 * /faq — Phase 10's public FAQ page, reading the new public
 * GET /api/faqs (backend/controllers/faqController.js). FAQ.js
 * (backend/models/FAQ.js) has existed since Phase 1 with no route or UI
 * built against it until now — see README.md's own "not yet built" note
 * on the FAQ model, and coding-phases.md's Phase 10 section calling this
 * out as "the last remaining feature."
 *
 * Not part of context.md's recorded reference-video walkthrough, unlike
 * every other page in this app — Section 3 explains why: the old PHP
 * project's ER diagram had an `faq` table that was "designed but never
 * actually created" in the real database, so there's no reference
 * screen to match pixel-for-pixel here, only a schema (Section 5) and a
 * role decision (Section 9, "should Certificate and FAQ be included" —
 * resolved as yes, see AUDIT_FIXES.md item 2) to build against. Design
 * choices below are this phase's own, not a fidelity check against
 * anything context.md describes.
 *
 * Renders Home.jsx's real `Navbar`/`Footer` (now named exports) rather
 * than a second copy of that markup — see Navbar's own doc comment in
 * Home.jsx for why a stateful, auth-aware component is the one thing in
 * this codebase's "duplicate per page" CSS convention worth an
 * exception. Also imports Home.css directly (not just for the navbar/
 * footer rules) to reuse `.home-section`, `.home-section-header`,
 * `.card`, `.empty-state`, and `.home-inline-error` as-is — this page's
 * content is one more section in the same visual language the rest of
 * the public site already uses, so FAQ.css only needs to add what's
 * actually new: the accordion itself.
 */
const FAQ = () => {
  const [faqs, setFaqs] = useState(null)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const { data } = await api.get('/faqs')
        if (!cancelled) setFaqs(data.faqs)
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Could not load FAQs.')
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const loading = faqs === null && !error

  // Independent per-item toggle (not accordion-exclusive) — opening one
  // question doesn't close another. With a handful of FAQs this reads as
  // "expand what you're curious about," not a single-focus widget, and
  // avoids the extra surprise of a question you were reading collapsing
  // because you opened a different one.
  const toggle = (id) => setOpenId((current) => (current === id ? null : id))

  return (
    <div className="home-page">
      <Navbar />
      <main>
        <section className="home-section">
          <div className="home-section-header">
            <h1>Frequently Asked Questions</h1>
            <p>Everything you need to know before you start a certification evaluation.</p>
          </div>

          {error && (
            <p className="home-inline-error" role="alert">
              {error}
            </p>
          )}

          {loading && <p>Loading FAQs…</p>}

          {!loading && faqs?.length === 0 && (
            <div className="empty-state card">
              <h3>No FAQs yet</h3>
              <p>Check back soon.</p>
            </div>
          )}

          {faqs?.length > 0 && (
            <div className="faq-list">
              {faqs.map((faq) => {
                const isOpen = openId === faq._id
                return (
                  <div key={faq._id} className="card faq-item">
                    <button
                      type="button"
                      className="faq-question"
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${faq._id}`}
                      onClick={() => toggle(faq._id)}
                    >
                      <span>{faq.question}</span>
                      <span className="faq-toggle-icon" aria-hidden="true">
                        {isOpen ? '−' : '+'}
                      </span>
                    </button>
                    {isOpen && (
                      <p id={`faq-answer-${faq._id}`} className="faq-answer">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default FAQ

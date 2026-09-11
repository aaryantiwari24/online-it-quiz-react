import { useEffect, useState } from 'react';
import api from '../../services/api';
import './Supplier.css';

const EMPTY_FORM = {
  category: '',
  question: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'A',
  difficulty: 'Easy',
};

const ANSWER_KEYS = ['A', 'B', 'C', 'D'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

/**
 * /supplier/add-question — standalone create-only form, always reached
 * via the sidebar nav link (never a modal, per build-prompt Section 7).
 * Field shape matches admin's ManageQuestions.jsx form exactly (Section
 * 5) — Category select, Question textarea, a 2x2 option grid, then
 * Correct Answer + Difficulty selects — just without the edit/toggle
 * machinery, since this page is never anything but "create". Does not
 * send createdBy — the server sets it from the JWT.
 *
 * On success, resets the form and shows an inline confirmation instead
 * of redirecting to /supplier/questions: suppliers plausibly add several
 * questions back-to-back, so staying put avoids re-navigating for each
 * one (build-prompt Section 5's own stated preference between the two
 * allowed options). The reset keeps the just-used category selected —
 * the field most likely to stay the same for the next question in a
 * row — while question/options/answer/difficulty go back to defaults.
 */
const AddQuestion = () => {
  const [categories, setCategories] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data } = await api.get('/categories');
        if (cancelled) return;
        setCategories(data.categories);
        if (data.categories.length > 0) {
          setForm((f) => ({ ...f, category: f.category || data.categories[0]._id }));
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.response?.data?.error || 'Could not load categories.');
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = (field) => (e) => {
    setSuccessMessage('');
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');
    setSubmitting(true);
    try {
      await api.post('/questions', form);
      setForm((f) => ({ ...EMPTY_FORM, category: f.category }));
      setSuccessMessage('Question added. You can add another below.');
    } catch (err) {
      setFormError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const categoriesLoading = categories === null && !loadError;

  return (
    <div>
      <div className="supplier-page-header">
        <div>
          <h1>Add Question</h1>
          <p>Contribute a new question to one of the existing categories.</p>
        </div>
      </div>

      {loadError && (
        <p className="supplier-inline-error" role="alert">
          {loadError}
        </p>
      )}

      {categoriesLoading && <p>Loading categories…</p>}

      {!categoriesLoading && categories?.length === 0 && (
        <div className="empty-state card">
          <h3>No categories yet</h3>
          <p>Ask an admin to add a category before contributing questions.</p>
        </div>
      )}

      {categories?.length > 0 && (
        <div className="card supplier-form">
          {formError && (
            <p className="supplier-inline-error" role="alert">
              {formError}
            </p>
          )}
          {successMessage && (
            <p
              role="status"
              style={{
                background: 'rgba(31, 157, 108, 0.12)',
                color: 'var(--color-success)',
                fontSize: '0.9rem',
                padding: '0.7rem 0.9rem',
                borderRadius: 'var(--radius-control)',
                margin: '0 0 1.25rem',
              }}
            >
              {successMessage}
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="supplier-field">
              <label htmlFor="q-category">Category</label>
              <select
                id="q-category"
                value={form.category}
                onChange={updateField('category')}
                required
              >
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="supplier-field">
              <label htmlFor="q-text">Question</label>
              <textarea
                id="q-text"
                value={form.question}
                onChange={updateField('question')}
                required
              />
            </div>

            <div className="supplier-form-grid">
              <div className="supplier-field">
                <label htmlFor="q-option-a">Option A</label>
                <input
                  id="q-option-a"
                  type="text"
                  value={form.option_a}
                  onChange={updateField('option_a')}
                  required
                />
              </div>
              <div className="supplier-field">
                <label htmlFor="q-option-b">Option B</label>
                <input
                  id="q-option-b"
                  type="text"
                  value={form.option_b}
                  onChange={updateField('option_b')}
                  required
                />
              </div>
              <div className="supplier-field">
                <label htmlFor="q-option-c">Option C</label>
                <input
                  id="q-option-c"
                  type="text"
                  value={form.option_c}
                  onChange={updateField('option_c')}
                  required
                />
              </div>
              <div className="supplier-field">
                <label htmlFor="q-option-d">Option D</label>
                <input
                  id="q-option-d"
                  type="text"
                  value={form.option_d}
                  onChange={updateField('option_d')}
                  required
                />
              </div>
            </div>

            <div className="supplier-form-grid">
              <div className="supplier-field">
                <label htmlFor="q-correct">Correct Answer</label>
                <select id="q-correct" value={form.correct_answer} onChange={updateField('correct_answer')}>
                  {ANSWER_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div className="supplier-field">
                <label htmlFor="q-difficulty">Difficulty</label>
                <select id="q-difficulty" value={form.difficulty} onChange={updateField('difficulty')}>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="supplier-form-actions">
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AddQuestion;

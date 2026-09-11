import { useEffect, useState } from 'react';
import api from '../../services/api';
import StatusPill from '../../components/admin/StatusPill';
import './Admin.css';

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

const DIFFICULTY_TONE = { Easy: 'easy', Medium: 'medium', Hard: 'hard' };
const ANSWER_KEYS = ['A', 'B', 'C', 'D'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

/**
 * /admin/questions — filterable by category (required — questionRoutes.js
 * has no "all categories" endpoint, only GET /category/:id) and, as a
 * bonus matching that same endpoint's optional ?difficulty param, by
 * difficulty too. Same inline create/edit form pattern as
 * ManageCategories.jsx — see that file's header comment for why there's
 * no modal.
 *
 * After a create/edit, this refetches the current filtered list instead
 * of splicing the API response into local state — questionController.js's
 * createQuestion/updateQuestion don't populate `createdBy`, so a spliced
 * response would show a raw id in the "Created By" column until the next
 * reload. `refreshTick` exists solely to trigger that refetch without
 * duplicating the fetch logic that's already in the effect below.
 */
const ManageQuestions = () => {
  const [categories, setCategories] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [questions, setQuestions] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [rowError, setRowError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const { data } = await api.get('/categories');
        if (cancelled) return;
        setCategories(data.categories);
        if (data.categories.length > 0) {
          setSelectedCategoryId((current) => current || data.categories[0]._id);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.response?.data?.error || 'Could not load categories.');
        }
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCategoryId) return;
    let cancelled = false;

    const load = async () => {
      setQuestions(null);
      try {
        const params = selectedDifficulty !== 'All' ? { difficulty: selectedDifficulty } : {};
        const { data } = await api.get(`/questions/category/${selectedCategoryId}`, { params });
        if (!cancelled) setQuestions(data.questions);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.response?.data?.error || 'Could not load questions.');
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId, selectedDifficulty, refreshTick]);

  const openCreateForm = () => {
    setEditingTarget(null);
    setForm({ ...EMPTY_FORM, category: selectedCategoryId });
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (q) => {
    setEditingTarget(q);
    setForm({
      category: typeof q.category === 'object' ? q.category._id : q.category,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      difficulty: q.difficulty,
    });
    setFormError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const updateField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (editingTarget) {
        await api.put(`/questions/${editingTarget._id}`, form);
      } else {
        await api.post('/questions', form);
      }
      closeForm();
      setRefreshTick((t) => t + 1);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (q) => {
    if (!window.confirm('Delete this question? This cannot be undone.')) {
      return;
    }
    setRowError('');
    setDeletingId(q._id);
    try {
      await api.delete(`/questions/${q._id}`);
      setQuestions((prev) => prev.filter((item) => item._id !== q._id));
    } catch (err) {
      setRowError(err.response?.data?.error || 'Could not delete this question.');
    } finally {
      setDeletingId(null);
    }
  };

  const categoriesLoading = categories === null && !loadError;
  const questionsLoading = questions === null && !loadError && Boolean(selectedCategoryId);

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Manage Questions</h1>
          <p>Add, edit, or remove questions for each category.</p>
        </div>
        {!formOpen && selectedCategoryId && (
          <button type="button" className="btn btn--primary" onClick={openCreateForm}>
            + Add Question
          </button>
        )}
      </div>

      {loadError && (
        <p className="admin-inline-error" role="alert">
          {loadError}
        </p>
      )}
      {rowError && (
        <p className="admin-inline-error" role="alert">
          {rowError}
        </p>
      )}

      {categoriesLoading && <p>Loading categories…</p>}

      {!categoriesLoading && categories?.length === 0 && (
        <div className="empty-state card">
          <h3>No categories yet</h3>
          <p>Add a category first, under Manage Categories, before adding questions.</p>
        </div>
      )}

      {categories?.length > 0 && (
        <div className="admin-filter-bar">
          <div className="admin-filter-field">
            <label htmlFor="filter-category">Category</label>
            <select
              id="filter-category"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-filter-field">
            <label htmlFor="filter-difficulty">Difficulty</label>
            <select
              id="filter-difficulty"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
            >
              <option value="All">All</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="card admin-form">
          <h2>{editingTarget ? 'Edit Question' : 'Add Question'}</h2>

          {formError && (
            <p className="admin-inline-error" role="alert">
              {formError}
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="admin-field">
              <label htmlFor="q-category">Category</label>
              <select id="q-category" value={form.category} onChange={updateField('category')} required>
                {categories?.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-field">
              <label htmlFor="q-text">Question</label>
              <textarea id="q-text" value={form.question} onChange={updateField('question')} required />
            </div>

            <div className="admin-form-grid">
              <div className="admin-field">
                <label htmlFor="q-option-a">Option A</label>
                <input id="q-option-a" type="text" value={form.option_a} onChange={updateField('option_a')} required />
              </div>
              <div className="admin-field">
                <label htmlFor="q-option-b">Option B</label>
                <input id="q-option-b" type="text" value={form.option_b} onChange={updateField('option_b')} required />
              </div>
              <div className="admin-field">
                <label htmlFor="q-option-c">Option C</label>
                <input id="q-option-c" type="text" value={form.option_c} onChange={updateField('option_c')} required />
              </div>
              <div className="admin-field">
                <label htmlFor="q-option-d">Option D</label>
                <input id="q-option-d" type="text" value={form.option_d} onChange={updateField('option_d')} required />
              </div>
            </div>

            <div className="admin-form-grid">
              <div className="admin-field">
                <label htmlFor="q-correct">Correct Answer</label>
                <select id="q-correct" value={form.correct_answer} onChange={updateField('correct_answer')}>
                  {ANSWER_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
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

            <div className="admin-form-actions">
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={closeForm} disabled={submitting}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {questionsLoading && <p>Loading questions…</p>}

      {!questionsLoading && questions?.length === 0 && (
        <div className="empty-state card">
          <h3>No questions in this category yet</h3>
          <p>Use "+ Add Question" above to add the first one.</p>
        </div>
      )}

      {questions?.length > 0 && (
        <div className="card admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Difficulty</th>
                <th>Correct Answer</th>
                <th>Created By</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q._id}>
                  <td data-label="Question">{q.question}</td>
                  <td data-label="Difficulty">
                    <StatusPill label={q.difficulty} tone={DIFFICULTY_TONE[q.difficulty]} />
                  </td>
                  <td data-label="Correct Answer">{q.correct_answer}</td>
                  <td data-label="Created By">
                    {q.createdBy ? `${q.createdBy.name} (${q.createdBy.role})` : 'Unknown'}
                  </td>
                  <td data-label="Actions" className="admin-table-actions">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEditForm(q)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger-ghost btn--sm"
                      onClick={() => handleDelete(q)}
                      disabled={deletingId === q._id}
                    >
                      {deletingId === q._id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManageQuestions;

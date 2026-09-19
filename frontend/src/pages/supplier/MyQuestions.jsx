import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusPill from '../../components/supplier/StatusPill';
import './Supplier.css';

const DIFFICULTY_TONE = { Easy: 'easy', Medium: 'medium', Hard: 'hard' };
const ANSWER_KEYS = ['A', 'B', 'C', 'D'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

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

/**
 * /supplier/questions — every question this supplier created, across
 * every category, with client-side Category/Difficulty filters and
 * inline Edit/Delete.
 */
const MyQuestions = () => {
  const { user } = useAuth();

  const [categories, setCategories] = useState(null);
  const [myQuestions, setMyQuestions] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [selectedCategoryId, setSelectedCategoryId] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');

  const [editingTarget, setEditingTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [rowError, setRowError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data: categoriesData } = await api.get('/categories');

        if (cancelled) return;

        const cats = categoriesData.categories;
        setCategories(cats);

        const perCategory = await Promise.all(
          cats.map(async (c) => {
            const { data } = await api.get(`/questions/category/${c._id}`);

            return data.questions.map((q) => ({
              ...q,
              categoryId: c._id,
              categoryName: c.category_name,
            }));
          })
        );

        if (cancelled) return;

        const mine = perCategory
          .flat()
          .filter((q) => q.createdBy?._id === user.id);

        setMyQuestions(mine);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err.response?.data?.error ||
              'Could not load your questions.'
          );
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const openEditForm = (q) => {
    setEditingTarget(q);

    setForm({
      category: q.categoryId,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      difficulty: q.difficulty,
    });

    setFormError('');
  };

  const closeForm = () => {
    setEditingTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const updateField = (field) => (e) => {
    setForm((f) => ({
      ...f,
      [field]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setFormError('');
    setSubmitting(true);

    try {
      const { data } = await api.put(
        `/questions/${editingTarget._id}`,
        form
      );

      const updated = data.question;

      const categoryName =
        categories.find(
          (c) => c._id === updated.category
        )?.category_name ?? 'Unknown Category';

      setMyQuestions((prev) =>
        prev.map((q) =>
          q._id === updated._id
            ? {
                ...updated,
                categoryId: updated.category,
                categoryName,
              }
            : q
        )
      );

      closeForm();
    } catch (err) {
      setFormError(
        err.response?.data?.error ||
          'Something went wrong. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (q) => {
    if (
      !window.confirm(
        'Delete this question? This cannot be undone.'
      )
    ) {
      return;
    }

    setRowError('');
    setDeletingId(q._id);

    try {
      await api.delete(`/questions/${q._id}`);

      setMyQuestions((prev) =>
        prev.filter((item) => item._id !== q._id)
      );
    } catch (err) {
      setRowError(
        err.response?.data?.error ||
          'Could not delete this question.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const loading = myQuestions === null && !loadError;

  const filtered = (myQuestions ?? []).filter((q) => {
    if (
      selectedCategoryId !== 'All' &&
      q.categoryId !== selectedCategoryId
    ) {
      return false;
    }

    if (
      selectedDifficulty !== 'All' &&
      q.difficulty !== selectedDifficulty
    ) {
      return false;
    }

    return true;
  });

  return (
    <div>
      <div className="supplier-page-header">
        <div>
          <h1>My Questions</h1>
          <p>
            Every question you&apos;ve added, across every category.
          </p>
        </div>

        <Link
          to="/supplier/add-question"
          className="btn btn--primary"
        >
          Add Question
        </Link>
      </div>

      {loadError && (
        <p className="supplier-inline-error" role="alert">
          {loadError}
        </p>
      )}

      {rowError && (
        <p className="supplier-inline-error" role="alert">
          {rowError}
        </p>
      )}

      {loading && <p>Loading your questions…</p>}

      {categories?.length > 0 && (
        <div className="supplier-filter-bar">
          <div className="supplier-filter-field">
            <label htmlFor="filter-category">
              Category
            </label>

            <select
              id="filter-category"
              value={selectedCategoryId}
              onChange={(e) =>
                setSelectedCategoryId(e.target.value)
              }
            >
              <option value="All">All Categories</option>

              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>

          <div className="supplier-filter-field">
            <label htmlFor="filter-difficulty">
              Difficulty
            </label>

            <select
              id="filter-difficulty"
              value={selectedDifficulty}
              onChange={(e) =>
                setSelectedDifficulty(e.target.value)
              }
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

      {editingTarget && (
        <div className="card supplier-form">
          <h2>Edit Question</h2>

          {formError && (
            <p
              className="supplier-inline-error"
              role="alert"
            >
              {formError}
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="supplier-field">
              <label htmlFor="q-category">
                Category
              </label>

              <select
                id="q-category"
                value={form.category}
                onChange={updateField('category')}
                required
              >
                {categories?.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="supplier-field">
              <label htmlFor="q-text">
                Question
              </label>

              <textarea
                id="q-text"
                value={form.question}
                onChange={updateField('question')}
                required
              />
            </div>

            <div className="supplier-form-grid">
              <div className="supplier-field">
                <label htmlFor="q-option-a">
                  Option A
                </label>

                <input
                  id="q-option-a"
                  type="text"
                  value={form.option_a}
                  onChange={updateField('option_a')}
                  required
                />
              </div>

              <div className="supplier-field">
                <label htmlFor="q-option-b">
                  Option B
                </label>

                <input
                  id="q-option-b"
                  type="text"
                  value={form.option_b}
                  onChange={updateField('option_b')}
                  required
                />
              </div>

              <div className="supplier-field">
                <label htmlFor="q-option-c">
                  Option C
                </label>

                <input
                  id="q-option-c"
                  type="text"
                  value={form.option_c}
                  onChange={updateField('option_c')}
                  required
                />
              </div>

              <div className="supplier-field">
                <label htmlFor="q-option-d">
                  Option D
                </label>

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
                <label htmlFor="q-correct">
                  Correct Answer
                </label>

                <select
                  id="q-correct"
                  value={form.correct_answer}
                  onChange={updateField('correct_answer')}
                >
                  {ANSWER_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div className="supplier-field">
                <label htmlFor="q-difficulty">
                  Difficulty
                </label>

                <select
                  id="q-difficulty"
                  value={form.difficulty}
                  onChange={updateField('difficulty')}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="supplier-form-actions">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={submitting}
              >
                {submitting ? 'Saving…' : 'Save'}
              </button>

              <button
                type="button"
                className="btn btn--ghost"
                onClick={closeForm}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {!loading &&
        filtered.length === 0 &&
        !loadError && (
          <div className="empty-state card">
            <h3>No questions yet</h3>

            <p>Add your first one to see it here.</p>

            <Link
              to="/supplier/add-question"
              className="btn btn--primary"
              style={{ marginTop: 16 }}
            >
              Add Question
            </Link>
          </div>
        )}

      {filtered.length > 0 && (
        <div className="card supplier-table-card">
          <table className="supplier-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Category</th>
                <th>Difficulty</th>
                <th>Correct Answer</th>
                <th aria-label="Actions" />
              </tr>
            </thead>

            <tbody>
              {filtered.map((q) => (
                <tr key={q._id}>
                  <td data-label="Question">
                    {q.question}
                  </td>

                  <td data-label="Category">
                    {q.categoryName}
                  </td>

                  <td data-label="Difficulty">
                    <StatusPill
                      label={q.difficulty}
                      tone={
                        DIFFICULTY_TONE[q.difficulty]
                      }
                    />
                  </td>

                  <td data-label="Correct Answer">
                    {q.correct_answer}
                  </td>

                  <td
                    data-label="Actions"
                    className="supplier-table-actions"
                  >
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => openEditForm(q)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="btn btn--danger-ghost btn--sm"
                      onClick={() => handleDelete(q)}
                      disabled={deletingId === q._id}
                    >
                      {deletingId === q._id
                        ? 'Deleting…'
                        : 'Delete'}
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

export default MyQuestions;
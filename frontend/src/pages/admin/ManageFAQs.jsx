import { useEffect, useState } from 'react';
import api from '../../services/api';
import './Admin.css';

const EMPTY_FORM = { question: '', answer: '' };

/**
 * /admin/faqs — Phase 10's admin-managed counterpart to the new public
 * /faq page. Table + inline create/edit form, deliberately the same
 * shape as ManageCategories.jsx (single form panel that toggles closed/
 * create/edit, plain window.confirm() for delete) — see that file's own
 * header comment for why this codebase doesn't use a modal/dialog
 * pattern anywhere. Backed by backend/controllers/faqController.js
 * (also new this phase).
 *
 * No duplicate-question check on create/update, unlike
 * ManageCategories' duplicate-name guard — FAQ.js has no unique
 * constraint on `question` (context.md Section 5's schema is just two
 * plain strings), and two FAQs with similar wording isn't actually a
 * data-integrity problem the way two categories with the same name
 * would be.
 */
const ManageFAQs = () => {
  const [faqs, setFaqs] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
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
        const { data } = await api.get('/faqs');
        if (!cancelled) setFaqs(data.faqs);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.response?.data?.error || 'Could not load FAQs.');
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openCreateForm = () => {
    setEditingTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (faq) => {
    setEditingTarget(faq);
    setForm({ question: faq.question, answer: faq.answer });
    setFormError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (editingTarget) {
        const { data } = await api.put(`/faqs/${editingTarget._id}`, form);
        setFaqs((prev) => prev.map((f) => (f._id === data.faq._id ? data.faq : f)));
      } else {
        const { data } = await api.post('/faqs', form);
        // Appended, not re-sorted client-side — matches getFAQs' own
        // _id-ascending order (see that function's comment in
        // faqController.js) without duplicating the sort logic here; a
        // newly created FAQ has the largest _id, so it always belongs
        // at the end of that order anyway.
        setFaqs((prev) => [...(prev ?? []), data.faq]);
      }
      closeForm();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (faq) => {
    if (!window.confirm(`Delete this FAQ ("${faq.question}")? This cannot be undone.`)) {
      return;
    }
    setRowError('');
    setDeletingId(faq._id);
    try {
      await api.delete(`/faqs/${faq._id}`);
      setFaqs((prev) => prev.filter((f) => f._id !== faq._id));
    } catch (err) {
      setRowError(err.response?.data?.error || 'Could not delete this FAQ.');
    } finally {
      setDeletingId(null);
    }
  };

  const loading = faqs === null && !loadError;

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Manage FAQs</h1>
          <p>Create, edit, or remove questions shown on the public FAQ page.</p>
        </div>
        {!formOpen && (
          <button type="button" className="btn btn--primary" onClick={openCreateForm}>
            + Add FAQ
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

      {formOpen && (
        <div className="card admin-form">
          <h2>{editingTarget ? 'Edit FAQ' : 'Add FAQ'}</h2>

          {formError && (
            <p className="admin-inline-error" role="alert">
              {formError}
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="admin-field">
              <label htmlFor="faq-question">Question</label>
              <input
                id="faq-question"
                type="text"
                value={form.question}
                onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                required
              />
            </div>

            <div className="admin-field">
              <label htmlFor="faq-answer">Answer</label>
              <textarea
                id="faq-answer"
                value={form.answer}
                onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
                required
              />
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

      {loading && <p>Loading FAQs…</p>}

      {!loading && faqs?.length === 0 && (
        <div className="empty-state card">
          <h3>No FAQs yet</h3>
          <p>Add your first question to populate the public FAQ page.</p>
        </div>
      )}

      {faqs?.length > 0 && (
        <div className="card admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Answer</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {faqs.map((faq) => (
                <tr key={faq._id}>
                  <td data-label="Question">{faq.question}</td>
                  <td data-label="Answer">{faq.answer}</td>
                  <td data-label="Actions" className="admin-table-actions">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEditForm(faq)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger-ghost btn--sm"
                      onClick={() => handleDelete(faq)}
                      disabled={deletingId === faq._id}
                    >
                      {deletingId === faq._id ? 'Deleting…' : 'Delete'}
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

export default ManageFAQs;

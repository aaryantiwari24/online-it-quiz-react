import { useEffect, useState } from 'react';
import api from '../../services/api';
import './Admin.css';

const EMPTY_FORM = { category_name: '', description: '' };

/**
 * /admin/categories — table + inline create/edit form, per
 * coding-phases.md's Phase 7 spec ("table + create/edit/delete forms").
 *
 * A single form panel toggles closed/create/edit rather than a modal —
 * this project has no modal/dialog pattern anywhere (Login, Register, and
 * every customer page are all single-purpose full pages), and building
 * one just for two admin forms felt like more machinery than the actual
 * need, in the same "keep it simple" spirit as Certificate.jsx's
 * window.print() choice over a PDF library. Delete confirmation is a
 * plain window.confirm() for the same reason.
 *
 * Backed by the existing categoryController.js endpoints from Phase 3 —
 * no backend changes needed for this page.
 */
const ManageCategories = () => {
  const [categories, setCategories] = useState(null);
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
        const { data } = await api.get('/categories');
        if (!cancelled) setCategories(data.categories);
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

  const openCreateForm = () => {
    setEditingTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (category) => {
    setEditingTarget(category);
    setForm({ category_name: category.category_name, description: category.description });
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
        const { data } = await api.put(`/categories/${editingTarget._id}`, form);
        setCategories((prev) => prev.map((c) => (c._id === data.category._id ? data.category : c)));
      } else {
        const { data } = await api.post('/categories', form);
        setCategories((prev) =>
          [...(prev ?? []), data.category].sort((a, b) => a.category_name.localeCompare(b.category_name))
        );
      }
      closeForm();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Delete "${category.category_name}"? This cannot be undone.`)) {
      return;
    }
    setRowError('');
    setDeletingId(category._id);
    try {
      await api.delete(`/categories/${category._id}`);
      setCategories((prev) => prev.filter((c) => c._id !== category._id));
    } catch (err) {
      // Most likely a 409 from categoryController.js's deleteCategory
      // blocking removal while questions still reference this category —
      // surfaced verbatim since that message already names the count.
      setRowError(err.response?.data?.error || 'Could not delete this category.');
    } finally {
      setDeletingId(null);
    }
  };

  const loading = categories === null && !loadError;

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Manage Categories</h1>
          <p>Create, edit, or remove quiz categories.</p>
        </div>
        {!formOpen && (
          <button type="button" className="btn btn--primary" onClick={openCreateForm}>
            + Add Category
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
          <h2>{editingTarget ? `Edit "${editingTarget.category_name}"` : 'Add Category'}</h2>

          {formError && (
            <p className="admin-inline-error" role="alert">
              {formError}
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="admin-field">
              <label htmlFor="category-name">Category Name</label>
              <input
                id="category-name"
                type="text"
                value={form.category_name}
                onChange={(e) => setForm((f) => ({ ...f, category_name: e.target.value }))}
                required
              />
            </div>

            <div className="admin-field">
              <label htmlFor="category-description">Description</label>
              <textarea
                id="category-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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

      {loading && <p>Loading categories…</p>}

      {!loading && categories?.length === 0 && (
        <div className="empty-state card">
          <h3>No categories yet</h3>
          <p>Add your first category to start building quizzes.</p>
        </div>
      )}

      {categories?.length > 0 && (
        <div className="card admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Description</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category._id}>
                  <td data-label="Category Name">{category.category_name}</td>
                  <td data-label="Description">{category.description}</td>
                  <td data-label="Actions" className="admin-table-actions">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEditForm(category)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger-ghost btn--sm"
                      onClick={() => handleDelete(category)}
                      disabled={deletingId === category._id}
                    >
                      {deletingId === category._id ? 'Deleting…' : 'Delete'}
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

export default ManageCategories;

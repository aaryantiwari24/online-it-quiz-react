import { useEffect, useState } from 'react';
import api from '../../services/api';
import './Admin.css';

/**
 * /admin/suppliers — list + remove, backed by the GET/DELETE
 * /api/users endpoints (see backend/controllers/userController.js).
 *
 * AUDIT_FIXES.md's F2 finding is resolved as of the security-fix pass
 * that closed self-service supplier registration (option 1 of the 3
 * F2 laid out): POST /api/auth/register now only ever creates
 * role: 'customer', so an admin creating an account here — via the new
 * POST /api/users (userController.js's createSupplier) — is now the
 * *only* way a supplier account gets made. This page previously only
 * needed list + remove because self-registration handled creation; now
 * that self-registration doesn't cover suppliers at all, this page needs
 * a create action too, or there'd be no UI path to the thing it manages.
 */
const EMPTY_FORM = { name: '', email: '', password: '', phone: '' };

const ManageSuppliers = () => {
  const [suppliers, setSuppliers] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [rowError, setRowError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Create-only, unlike ManageCategories.jsx's toggle form — there's no
  // PUT /api/users to edit an existing supplier (userController.js's
  // createSupplier is create-only; see that function's own comment on why
  // this endpoint stayed narrowly scoped), so there's no editingTarget
  // here, just open/closed.
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data } = await api.get('/users', { params: { role: 'supplier' } });
        if (!cancelled) setSuppliers(data.users);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.response?.data?.error || 'Could not load suppliers.');
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openCreateForm = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      // phone is optional — send undefined rather than '' when empty, so
      // an empty string doesn't get stored as the phone value (matches
      // how the field is optional on the User model itself).
      const { data } = await api.post('/users', {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
      });
      setSuppliers((prev) =>
        [...(prev ?? []), data.user].sort((a, b) => a.name.localeCompare(b.name))
      );
      closeForm();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (supplier) => {
    if (!window.confirm(`Remove "${supplier.name}"? This cannot be undone.`)) {
      return;
    }
    setRowError('');
    setDeletingId(supplier._id);
    try {
      await api.delete(`/users/${supplier._id}`);
      setSuppliers((prev) => prev.filter((s) => s._id !== supplier._id));
    } catch (err) {
      // Most likely a 409 from userController.js's deleteUser blocking
      // removal while this supplier still has authored questions —
      // surfaced verbatim since that message already names the count.
      setRowError(err.response?.data?.error || 'Could not remove this supplier.');
    } finally {
      setDeletingId(null);
    }
  };

  const loading = suppliers === null && !loadError;

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Manage Suppliers</h1>
          <p>Create and manage supplier accounts.</p>
        </div>
        {!formOpen && (
          <button type="button" className="btn btn--primary" onClick={openCreateForm}>
            + Add Supplier
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
          <h2>Add Supplier</h2>

          {formError && (
            <p className="admin-inline-error" role="alert">
              {formError}
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="admin-field">
              <label htmlFor="supplier-name">Full Name</label>
              <input
                id="supplier-name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div className="admin-field">
              <label htmlFor="supplier-email">Email Address</label>
              <input
                id="supplier-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div className="admin-field">
              <label htmlFor="supplier-password">Password</label>
              <input
                id="supplier-password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={8}
              />
            </div>

            <div className="admin-field">
              <label htmlFor="supplier-phone">Phone (optional)</label>
              <input
                id="supplier-phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>

            <div className="admin-form-actions">
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? 'Creating…' : 'Save'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={closeForm} disabled={submitting}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <p>Loading suppliers…</p>}

      {!loading && suppliers?.length === 0 && (
        <div className="empty-state card">
          <h3>No suppliers yet</h3>
          <p>Add your first supplier account to let them start contributing questions.</p>
        </div>
      )}

      {suppliers?.length > 0 && (
        <div className="card admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Joined</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s._id}>
                  <td data-label="Name">{s.name}</td>
                  <td data-label="Email">{s.email}</td>
                  <td data-label="Phone">{s.phone || '—'}</td>
                  <td data-label="Joined">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td data-label="Actions" className="admin-table-actions">
                    <button
                      type="button"
                      className="btn btn--danger-ghost btn--sm"
                      onClick={() => handleDelete(s)}
                      disabled={deletingId === s._id}
                    >
                      {deletingId === s._id ? 'Removing…' : 'Remove'}
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

export default ManageSuppliers;

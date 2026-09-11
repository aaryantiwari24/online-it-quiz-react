import { useEffect, useState } from 'react';
import api from '../../services/api';
import StatusPill from '../../components/admin/StatusPill';
import './Admin.css';

const STATUS_TONE = { Pass: 'pass', Fail: 'fail' };
const DIFFICULTY_TONE = { Easy: 'easy', Medium: 'medium', Hard: 'hard' };

/**
 * /admin/results — every customer's results, admin view (Phase 7 spec).
 * Same table shape as customer/History.jsx plus a Student column, backed
 * by the new admin-only GET /api/results (see resultController.js's
 * getAllResults) rather than the customer-scoped GET /api/results/me.
 *
 * List only, no per-row detail/review page — that would reuse
 * customer/Results.jsx's review UI, which is nested under /customer/*
 * and gated to the customer role client-side (ProtectedRoute), so it
 * isn't reachable from here. Not part of Phase 7's spec; flagging as a
 * natural follow-up rather than building it unasked.
 */
const AllResults = () => {
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => {
    let cancelled = false;
    api
      .get('/categories')
      .then(({ data }) => {
        if (!cancelled) setCategories(data.categories);
      })
      .catch(() => {
        // Categories here only populate an optional filter dropdown — if
        // this call fails the page still works, just without that
        // filter, so it's not worth its own error banner.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setResults(null);
      try {
        const params = {};
        if (statusFilter !== 'All') params.status = statusFilter;
        if (categoryFilter !== 'All') params.category = categoryFilter;
        const { data } = await api.get('/results', { params });
        if (!cancelled) setResults(data.results);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Could not load results.');
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, categoryFilter]);

  const loading = results === null && !error;

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>All Results</h1>
          <p>Every quiz attempt across every student, most recent first.</p>
        </div>
      </div>

      {error && (
        <p className="admin-inline-error" role="alert">
          {error}
        </p>
      )}

      <div className="admin-filter-bar">
        <div className="admin-filter-field">
          <label htmlFor="filter-status">Status</label>
          <select id="filter-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All</option>
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
          </select>
        </div>

        {categories.length > 0 && (
          <div className="admin-filter-field">
            <label htmlFor="filter-category">Category</label>
            <select id="filter-category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="All">All</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && <p>Loading results…</p>}

      {!loading && results?.length === 0 && (
        <div className="empty-state card">
          <h3>No results yet</h3>
          <p>Results will show up here once students start taking quizzes.</p>
        </div>
      )}

      {results?.length > 0 && (
        <div className="card admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Category</th>
                <th>Difficulty</th>
                <th>Score</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r._id}>
                  <td data-label="Student">
                    {r.customer?.name ?? 'Unknown'}
                    <br />
                    <span style={{ color: 'var(--color-ink-soft)', fontSize: '0.82rem' }}>
                      {r.customer?.email}
                    </span>
                  </td>
                  <td data-label="Category">{r.category?.category_name ?? 'Unknown Category'}</td>
                  <td data-label="Difficulty">
                    <StatusPill label={r.difficulty} tone={DIFFICULTY_TONE[r.difficulty]} />
                  </td>
                  <td data-label="Score" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {r.score}/{r.totalQuestions} ({r.percentage}%)
                  </td>
                  <td data-label="Status">
                    <StatusPill label={r.status} tone={STATUS_TONE[r.status]} />
                  </td>
                  <td data-label="Date">{new Date(r.attemptDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AllResults;

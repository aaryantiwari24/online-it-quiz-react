import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusPill from '../../components/admin/StatusPill';
import './Admin.css';

const STATUS_TONE = { Pass: 'pass', Fail: 'fail' };

/**
 * /admin/dashboard — landing page for the admin panel.
 *
 * Stats reuse the "Live Questions / Quizzes Taken / Difficulty Tiers /
 * Certificates Earned" style from the homepage's stats strip
 * (context.md Section 2), per coding-phases.md's Phase 7 instruction,
 * sourced from the new public GET /api/stats endpoint
 * (backend/controllers/statsController.js) — built this phase so Phase
 * 9's homepage can call the same endpoint rather than duplicating the
 * aggregation, matching that phase's own note that it might already
 * exist by the time it runs.
 *
 * The "Recent Results" panel below reuses customer/Dashboard.jsx's
 * "Recent Activity" pattern, scaled to every customer's results
 * (GET /api/results, admin-only) instead of just the logged-in
 * customer's own. Rows aren't links — there's no admin per-result detail
 * page yet (see AllResults.jsx's header comment for why), so they're
 * plain summaries rather than the clickable rows customer/Dashboard.jsx
 * has.
 */
const DashboardOverview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState('');
  const [results, setResults] = useState(null);
  const [resultsError, setResultsError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const { data } = await api.get('/stats');
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) {
          setStatsError(err.response?.data?.error || 'Could not load stats.');
        }
      }
    };

    const loadResults = async () => {
      try {
        const { data } = await api.get('/results');
        if (!cancelled) setResults(data.results);
      } catch (err) {
        if (!cancelled) {
          setResultsError(err.response?.data?.error || 'Could not load recent results.');
        }
      }
    };

    loadStats();
    loadResults();
    return () => {
      cancelled = true;
    };
  }, []);

  const statsLoading = stats === null && !statsError;
  const resultsLoading = results === null && !resultsError;
  const recent = (results ?? []).slice(0, 5);

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p>Here&apos;s a summary of platform-wide activity.</p>
        </div>
      </div>

      {statsError && (
        <p className="admin-inline-error" role="alert">
          {statsError}
        </p>
      )}

      {statsLoading ? (
        <p>Loading stats…</p>
      ) : (
        <div className="admin-grid admin-grid--stats" style={{ marginBottom: 28 }}>
          <div className="card">
            <p className="admin-stat-label">Live Questions</p>
            <p className="admin-stat-value">{stats.liveQuestions}</p>
          </div>
          <div className="card">
            <p className="admin-stat-label">Quizzes Taken</p>
            <p className="admin-stat-value">{stats.quizzesTaken}</p>
          </div>
          <div className="card">
            <p className="admin-stat-label">Difficulty Tiers</p>
            <p className="admin-stat-value">{stats.difficultyTiers}</p>
          </div>
          <div className="card">
            <p className="admin-stat-label">Certificates Earned</p>
            <p className="admin-stat-value">{stats.certificatesEarned}</p>
          </div>
        </div>
      )}

      <div className="card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Recent Results</h2>
          {recent.length > 0 && (
            <Link to="/admin/results" className="btn btn--ghost btn--sm">
              View All
            </Link>
          )}
        </div>

        {resultsError && (
          <p className="admin-inline-error" role="alert">
            {resultsError}
          </p>
        )}

        {resultsLoading && <p>Loading…</p>}

        {!resultsLoading && recent.length === 0 && !resultsError && (
          <div className="empty-state">
            <h3>No attempts yet</h3>
            <p>Once a student takes a quiz, it&apos;ll show up here.</p>
          </div>
        )}

        {recent.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recent.map((r) => (
              <div
                key={r._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-control)',
                  border: '1px solid var(--color-border)',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 700 }}>
                    {r.customer?.name ?? 'Unknown'} · {r.category?.category_name ?? 'Unknown Category'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
                    {r.difficulty} · {new Date(r.attemptDate).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{r.percentage}%</span>
                  <StatusPill label={r.status} tone={STATUS_TONE[r.status]} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardOverview;

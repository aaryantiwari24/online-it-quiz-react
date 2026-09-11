import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusPill from '../../components/supplier/StatusPill';
import './Supplier.css';

const DIFFICULTY_TONE = { Easy: 'easy', Medium: 'medium', Hard: 'hard' };
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const truncate = (text, max = 90) =>
  text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

/**
 * /supplier/dashboard — landing page for the supplier panel.
 *
 * No supplier-specific stats endpoint exists (build-prompt Section 3) —
 * GET /api/stats is site-wide only and isn't creator-scoped. So this
 * loads GET /api/categories, then GET /api/questions/category/:id for
 * every category in parallel (Promise.all), attaches each result's own
 * categoryId/categoryName from the loop (rather than reading q.category
 * back off the response — that endpoint doesn't populate category, so
 * it'd just be the same id already known from the loop), concatenates
 * everything, and filters to q.createdBy?._id === user.id. Every count
 * below and the Recent Questions list are plain derived values from that
 * one fetched array — a single loading/error pair covers both, unlike
 * admin's DashboardOverview.jsx which has two independent data sources
 * (site stats + all customers' results) and so needs two.
 *
 * Stat cards: Questions Submitted and Categories Contributed To are the
 * two the build prompt requires outright. The optional third — a
 * difficulty breakdown — is one card holding all three Easy/Medium/Hard
 * counts side by side (via StatusPill) rather than a literal 4th card,
 * since 3 difficulty values don't split evenly across "one more card"
 * without an arbitrary merge (see PHASE_8_VERIFICATION.md).
 */
const DashboardOverview = () => {
  const { user } = useAuth();
  const [myQuestions, setMyQuestions] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data: categoriesData } = await api.get('/categories');
        if (cancelled) return;
        const categories = categoriesData.categories;

        const perCategory = await Promise.all(
          categories.map(async (c) => {
            const { data } = await api.get(`/questions/category/${c._id}`);
            return data.questions.map((q) => ({
              ...q,
              categoryId: c._id,
              categoryName: c.category_name,
            }));
          })
        );
        if (cancelled) return;

        const mine = perCategory.flat().filter((q) => q.createdBy?._id === user.id);
        setMyQuestions(mine);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.response?.data?.error || 'Could not load your dashboard.');
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const loading = myQuestions === null && !loadError;
  const mine = myQuestions ?? [];

  const totalQuestions = mine.length;
  const categoriesContributedTo = new Set(mine.map((q) => q.categoryId)).size;
  const difficultyCounts = { Easy: 0, Medium: 0, Hard: 0 };
  mine.forEach((q) => {
    if (difficultyCounts[q.difficulty] !== undefined) difficultyCounts[q.difficulty] += 1;
  });

  const recent = [...mine]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <div>
      <div className="supplier-page-header">
        <div>
          <h1>Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p>Here&apos;s a summary of the questions you&apos;ve contributed.</p>
        </div>
      </div>

      {loadError && (
        <p className="supplier-inline-error" role="alert">
          {loadError}
        </p>
      )}

      {loading ? (
        <p>Loading stats…</p>
      ) : (
        <div className="supplier-grid supplier-grid--stats" style={{ marginBottom: 28 }}>
          <div className="card">
            <p className="supplier-stat-label">Questions Submitted</p>
            <p className="supplier-stat-value">{totalQuestions}</p>
          </div>
          <div className="card">
            <p className="supplier-stat-label">Categories Contributed To</p>
            <p className="supplier-stat-value">{categoriesContributedTo}</p>
          </div>
          <div className="card">
            <p className="supplier-stat-label">By Difficulty</p>
            <div style={{ display: 'flex', gap: 20, marginTop: 10, flexWrap: 'wrap' }}>
              {DIFFICULTIES.map((d) => (
                <div key={d} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <StatusPill label={d} tone={DIFFICULTY_TONE[d]} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 700 }}>
                    {difficultyCounts[d]}
                  </span>
                </div>
              ))}
            </div>
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
          <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Recent Questions</h2>
          {recent.length > 0 && (
            <Link to="/supplier/questions" className="btn btn--ghost btn--sm">
              View All
            </Link>
          )}
        </div>

        {loading && <p>Loading…</p>}

        {!loading && recent.length === 0 && !loadError && (
          <div className="empty-state">
            <h3>No questions yet</h3>
            <p>Add your first one to see it here.</p>
            <Link to="/supplier/add-question" className="btn btn--primary" style={{ marginTop: 16 }}>
              Add Your First Question
            </Link>
          </div>
        )}

        {recent.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recent.map((q) => (
              <div
                key={q._id}
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
                  <p style={{ margin: 0, fontWeight: 700 }}>{truncate(q.question)}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
                    {q.categoryName}
                  </p>
                </div>
                <StatusPill label={q.difficulty} tone={DIFFICULTY_TONE[q.difficulty]} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardOverview;

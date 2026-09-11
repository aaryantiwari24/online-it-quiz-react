// Local duplicate of components/admin/StatusPill.jsx (itself a duplicate
// of components/customer/StatusPill.jsx) — same "keep each role area
// self-contained" reasoning already used for the admin copy: components/
// supplier doesn't reach into components/admin for a three-line
// presentational component. Identical tone-to-class map.
const TONE_CLASS = {
  pass: 'status-pill--pass',
  fail: 'status-pill--fail',
  easy: 'status-pill--easy',
  medium: 'status-pill--medium',
  hard: 'status-pill--hard',
  neutral: 'status-pill--neutral',
};

const StatusPill = ({ label, tone = 'neutral' }) => {
  const toneClass = TONE_CLASS[tone] ?? TONE_CLASS.neutral;
  return <span className={`status-pill ${toneClass}`}>{label}</span>;
};

export default StatusPill;

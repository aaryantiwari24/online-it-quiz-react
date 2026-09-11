// Local duplicate of components/customer/StatusPill.jsx — same reasoning
// as this codebase's other file-local helpers (see e.g.
// categoryController.js's isValidObjectId comment on the backend): keeps
// components/admin self-contained rather than reaching into
// components/customer for a three-line presentational component.
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

// Small rounded pill for a Pass/Fail status or a difficulty tier
// (Easy/Medium/Hard). index.css's design-tokens comment calls out
// "rounded pill status badges" as a recurring pattern reserved for
// phases 6-10 — this is that pattern's first real use, shared here so
// Dashboard's recent-activity list, History's table, and Results' header
// all render the exact same pill instead of three near-identical copies.
//
// `tone` picks the color rather than inferring it from `label`, so this
// stays reusable for difficulty tiers too (which aren't Pass/Fail at
// all) instead of only ever matching two hardcoded strings.
const TONE_CLASS = {
  pass: 'status-pill--pass',
  fail: 'status-pill--fail',
  easy: 'status-pill--easy',
  medium: 'status-pill--medium',
  hard: 'status-pill--hard',
  neutral: 'status-pill--neutral',
}

const StatusPill = ({ label, tone = 'neutral' }) => {
  const toneClass = TONE_CLASS[tone] ?? TONE_CLASS.neutral
  return <span className={`status-pill ${toneClass}`}>{label}</span>
}

export default StatusPill

// Circular percentage indicator for the Results page (and reused smaller
// on Dashboard's stat cards). Plain inline SVG rather than a charting
// library — frontend/package.json has no chart dependency, and a single
// progress ring doesn't justify adding one.
//
// stroke-dasharray/dashoffset math: a circle of radius r has circumference
// 2*pi*r. Setting dasharray to that circumference and dashoffset to
// circumference * (1 - percentage/100) draws exactly `percentage`% of the
// ring, going clockwise from 12 o'clock once the SVG is rotated -90deg
// (handled in Customer.css, since that's a presentational transform, not
// data this component owns).
const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const ScoreRing = ({ percentage, size = 140, label }) => {
  const clamped = Math.max(0, Math.min(100, percentage))
  const offset = CIRCUMFERENCE * (1 - clamped / 100)
  const passed = clamped >= 60

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="score-ring__svg">
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          className="score-ring__track"
          fill="none"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          className={`score-ring__fill ${passed ? 'score-ring__fill--pass' : 'score-ring__fill--fail'}`}
          fill="none"
          strokeWidth="10"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="score-ring__center">
        <span className="score-ring__value">{clamped}%</span>
        {label && <span className="score-ring__label">{label}</span>}
      </div>
    </div>
  )
}

export default ScoreRing

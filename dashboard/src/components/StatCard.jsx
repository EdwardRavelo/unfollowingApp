export default function StatCard({ label, value, delta }) {
  let deltaEl = null
  if (delta !== undefined && delta !== null) {
    const cls = delta > 0 ? 'pos' : delta < 0 ? 'neg' : 'zero'
    const sign = delta > 0 ? '+' : ''
    deltaEl = <div className={`delta ${cls}`}>{sign}{delta} desde la última captura</div>
  }
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {deltaEl}
    </div>
  )
}

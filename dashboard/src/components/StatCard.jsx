/**
 * Tarjeta de métrica. `hint` explica en una línea qué significa el número.
 * Con `onClick` se vuelve un botón que lleva a la lista correspondiente.
 */
export default function StatCard({ label, value, delta, hint, tone, onClick }) {
  let deltaEl = null
  if (delta !== undefined && delta !== null) {
    const cls = delta > 0 ? 'pos' : delta < 0 ? 'neg' : 'zero'
    const text = delta === 0 ? 'igual que la captura anterior' : `${delta > 0 ? '+' : ''}${delta} desde la captura anterior`
    deltaEl = <div className={`delta ${cls}`}>{text}</div>
  }
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`stat-card ${tone || ''} ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {deltaEl}
      {hint && <div className="hint">{hint}</div>}
      {onClick && <div className="go">Ver lista →</div>}
    </Tag>
  )
}

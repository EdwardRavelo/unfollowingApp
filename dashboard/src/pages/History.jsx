import { computeChanges } from '../lib/diff.js'

function fmt(iso) {
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })
}

function Line({ icon, color, users }) {
  if (users.length === 0) return null
  return (
    <div style={{ margin: '4px 0', fontSize: '0.88rem' }}>
      <span style={{ color }}>{icon} {users.length}</span>
      <span style={{ color: 'var(--text-muted)' }}> — {users.map((u) => '@' + u.username).join(', ')}</span>
    </div>
  )
}

export default function History({ snapshots }) {
  const sorted = [...snapshots].sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt))
  const events = []
  for (let i = 1; i < sorted.length; i++) {
    events.push({ at: sorted[i].capturedAt, changes: computeChanges(sorted[i - 1], sorted[i]) })
  }

  return (
    <div className="panel">
      <h2>Historial de cambios</h2>
      <p className="sub">Qué pasó entre cada par de capturas, de más reciente a más antiguo.</p>
      {events.length === 0 ? (
        <div className="empty">Necesitas al menos 2 capturas para ver el historial.</div>
      ) : (
        [...events].reverse().map((e) => (
          <div key={e.at} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
            <strong>{fmt(e.at)}</strong>
            <Line icon="➕" color="var(--pos)" users={e.changes.newFollowers} />
            <Line icon="➖" color="var(--neg)" users={e.changes.unfollowers} />
            <Line icon="👉" color="#7048e8" users={e.changes.iFollowed} />
            <Line icon="🚫" color="var(--text-muted)" users={e.changes.iUnfollowed} />
            {e.changes.newFollowers.length === 0 &&
              e.changes.unfollowers.length === 0 &&
              e.changes.iFollowed.length === 0 &&
              e.changes.iUnfollowed.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin cambios.</div>
              )}
          </div>
        ))
      )}
    </div>
  )
}

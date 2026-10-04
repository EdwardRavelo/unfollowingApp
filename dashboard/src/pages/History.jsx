import { computeChanges } from '../lib/diff.js'

function fmt(iso) {
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
}

const KINDS = [
  { key: 'unfollowers', label: 'Te dejaron de seguir', cls: 'neg' },
  { key: 'newFollowers', label: 'Nuevos seguidores', cls: 'pos' },
  { key: 'iFollowed', label: 'Empezaste a seguir', cls: '' },
  { key: 'iUnfollowed', label: 'Dejaste de seguir', cls: '' },
]

export default function History({ snapshots }) {
  const sorted = [...snapshots].sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt))
  const events = []
  for (let i = 1; i < sorted.length; i++) {
    events.push({
      from: sorted[i - 1].capturedAt,
      at: sorted[i].capturedAt,
      changes: computeChanges(sorted[i - 1], sorted[i]),
    })
  }

  return (
    <div className="panel">
      <h2>Historial de cambios</h2>
      <p className="sub">Qué cambió entre cada captura y la anterior. Lo más reciente, arriba.</p>
      {events.length === 0 ? (
        <div className="empty">
          <div className="big">🕒</div>
          Necesitas al menos 2 capturas para ver el historial.
        </div>
      ) : (
        <ol className="timeline">
          {[...events].reverse().map((e) => {
            const kinds = KINDS.filter((k) => e.changes[k.key].length > 0)
            return (
              <li key={e.at}>
                <div className="when">
                  <strong>{fmt(e.at)}</strong>
                  <span> · comparado con el {fmt(e.from)}</span>
                </div>
                {kinds.length === 0 ? (
                  <div className="none">Sin cambios.</div>
                ) : (
                  kinds.map((k) => (
                    <div className="change" key={k.key}>
                      <span className={`tag ${k.cls}`}>{k.label} · {e.changes[k.key].length}</span>
                      <span className="who">{e.changes[k.key].map((u) => '@' + u.username).join(', ')}</span>
                    </div>
                  ))
                )}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

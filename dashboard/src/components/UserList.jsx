import { useMemo, useState } from 'react'
import { downloadCsv } from '../lib/csv.js'

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Lista de usuarios con búsqueda, filtros (verificado/privado) y exportar CSV.
 * `showDate` muestra la fecha detectada (para unfollowers/nuevos).
 */
export default function UserList({ users, showDate = false, csvName = 'lista.csv', emptyText = 'Nada por aquí.' }) {
  const [query, setQuery] = useState('')
  const [onlyVerified, setOnlyVerified] = useState(false)
  const [onlyPrivate, setOnlyPrivate] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const result = users.filter((u) => {
      if (onlyVerified && !u.isVerified) return false
      if (onlyPrivate && !u.isPrivate) return false
      if (!q) return true
      return u.username.toLowerCase().includes(q) || (u.fullName || '').toLowerCase().includes(q)
    })
    if (showDate) {
      // Más reciente primero, según la fecha detectada.
      result.sort((a, b) => Date.parse(b.detectedAt || 0) - Date.parse(a.detectedAt || 0))
    }
    return result
  }, [users, query, onlyVerified, onlyPrivate, showDate])

  return (
    <div>
      <div className="list-toolbar">
        <input
          className="search"
          placeholder="Buscar por usuario o nombre…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className={`filter-chip ${onlyVerified ? 'on' : ''}`} onClick={() => setOnlyVerified((v) => !v)}>
          ✓ Verificados
        </button>
        <button className={`filter-chip ${onlyPrivate ? 'on' : ''}`} onClick={() => setOnlyPrivate((v) => !v)}>
          🔒 Privados
        </button>
        <button className="btn ghost" disabled={filtered.length === 0} onClick={() => downloadCsv(filtered, csvName)}>
          ⬇ CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">{emptyText}</div>
      ) : (
        <ul className="user-list">
          {filtered.map((u) => (
            <li className="user-row" key={u.id + (u.detectedAt || "")}>
              <div className="user-meta">
                <div className="name">
                  {u.username}
                  {u.isVerified && <span className="verified" title="Verificado">✔</span>}
                  {u.isPrivate && <span title="Privado">🔒</span>}
                </div>
                {u.fullName && <div className="full">{u.fullName}</div>}
              </div>
              {showDate && u.detectedAt && <span className="when">{fmtDate(u.detectedAt)}</span>}
              <a className="open" href={`https://instagram.com/${u.username}`} target="_blank" rel="noreferrer">
                Abrir ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

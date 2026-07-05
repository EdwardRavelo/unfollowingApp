import UserList from '../components/UserList.jsx'
import { computeChanges } from '../lib/diff.js'

export default function NewFollowers({ snapshots }) {
  const curr = snapshots[snapshots.length - 1]
  const prev = snapshots[snapshots.length - 2] || null
  const { newFollowers } = computeChanges(prev, curr)

  return (
    <div className="panel">
      <h2>Nuevos seguidores</h2>
      <p className="sub">Aparecieron entre la penúltima y la última captura.</p>
      {!prev ? (
        <div className="empty">
          <div className="big">📸</div>
          Necesitas al menos 2 capturas para detectar nuevos seguidores.
        </div>
      ) : (
        <UserList
          users={newFollowers}
          showDate
          csvName="nuevos-seguidores.csv"
          emptyText="Sin nuevos seguidores en la última captura."
        />
      )}
    </div>
  )
}

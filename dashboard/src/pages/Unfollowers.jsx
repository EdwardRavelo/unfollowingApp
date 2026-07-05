import UserList from '../components/UserList.jsx'
import { historyUnfollowers } from '../lib/diff.js'

export default function Unfollowers({ snapshots }) {
  const unfollowers = historyUnfollowers(snapshots)

  return (
    <div className="panel">
      <h2>Te dejaron de seguir</h2>
      <p className="sub">
        Personas que te seguían en una captura anterior y ya no. La fecha es cuándo se detectó
        (depende de cada cuánto extraes).
      </p>
      {snapshots.length < 2 ? (
        <div className="empty">
          <div className="big">📸</div>
          Necesitas al menos <strong>2 capturas</strong> para detectar unfollowers.
          Vuelve a extraer dentro de unos días e importa la nueva.
        </div>
      ) : (
        <UserList
          users={unfollowers}
          showDate
          csvName="unfollowers.csv"
          emptyText="🎉 Nadie te ha dejado de seguir entre tus capturas."
        />
      )}
    </div>
  )
}

import UserList from '../components/UserList.jsx'
import { computeRelations } from '../lib/diff.js'

export default function Relations({ snapshots }) {
  const curr = snapshots[snapshots.length - 1]
  const { notFollowingBack, notFollowedBack } = computeRelations(curr)

  return (
    <div className="two-col">
      <div className="panel">
        <h2>No te siguen de vuelta</h2>
        <p className="sub">Los sigues, pero ellos no a ti ({notFollowingBack.length}).</p>
        <UserList
          users={notFollowingBack}
          csvName="no-te-siguen.csv"
          emptyText="Todos a los que sigues te siguen de vuelta. 🙌"
        />
      </div>
      <div className="panel">
        <h2>No los sigues de vuelta</h2>
        <p className="sub">Te siguen, pero tú no a ellos ({notFollowedBack.length}).</p>
        <UserList
          users={notFollowedBack}
          csvName="fans.csv"
          emptyText="Sigues a todos tus seguidores."
        />
      </div>
    </div>
  )
}

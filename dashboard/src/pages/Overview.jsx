import StatCard from '../components/StatCard.jsx'
import TrendChart from '../components/TrendChart.jsx'
import { computeSummary, buildTrend, computeChanges } from '../lib/diff.js'

export default function Overview({ snapshots }) {
  const curr = snapshots[snapshots.length - 1]
  const prev = snapshots[snapshots.length - 2] || null
  const summary = computeSummary(curr, prev)
  const trend = buildTrend(snapshots)
  const changes = computeChanges(prev, curr)

  return (
    <div>
      <div className="stat-grid">
        <StatCard label="Seguidores" value={summary.followers} delta={summary.delta.followers} />
        <StatCard label="Seguidos" value={summary.following} delta={summary.delta.following} />
        <StatCard label="Mutuos" value={summary.mutual} />
        <StatCard label="Ratio seg./sig." value={summary.ratio.toFixed(2)} />
      </div>

      <div className="panel">
        <h2>Evolución</h2>
        <p className="sub">Seguidores, seguidos y mutuos a lo largo de tus capturas.</p>
        <TrendChart data={trend} />
      </div>

      {prev && (
        <div className="stat-grid">
          <StatCard label="Nuevos seguidores" value={changes.newFollowers.length} />
          <StatCard label="Te dejaron de seguir" value={changes.unfollowers.length} />
          <StatCard label="Empezaste a seguir" value={changes.iFollowed.length} />
          <StatCard label="Dejaste de seguir" value={changes.iUnfollowed.length} />
        </div>
      )}
    </div>
  )
}

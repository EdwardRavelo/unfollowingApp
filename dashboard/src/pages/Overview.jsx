import StatCard from '../components/StatCard.jsx'
import TrendChart from '../components/TrendChart.jsx'
import { computeSummary, buildTrend, computeChanges } from '../lib/diff.js'
import { incompleteParts } from '../lib/schema.js'

function fmt(iso) {
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'long' })
}

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`
}

export default function Overview({ snapshots, onNavigate }) {
  const curr = snapshots[snapshots.length - 1]
  const prev = snapshots[snapshots.length - 2] || null
  const summary = computeSummary(curr, prev)
  const trend = buildTrend(snapshots)
  const changes = computeChanges(prev, curr)
  const incomplete = incompleteParts(curr).length > 0 || (prev && incompleteParts(prev).length > 0)
  const lost = changes.unfollowers.length
  const gained = changes.newFollowers.length

  return (
    <div>
      {/* Lo importante en una frase, arriba del todo */}
      <div className="panel headline">
        {prev ? (
          <>
            <div className="eyebrow">Entre el {fmt(prev.capturedAt)} y el {fmt(curr.capturedAt)}</div>
            <h2 className="big-sentence">
              {lost === 0 ? (
                <>Nadie te dejó de seguir 🎉</>
              ) : (
                <>
                  <span className="neg">{plural(lost, 'persona', 'personas')}</span>
                  {lost === 1 ? ' te dejó de seguir' : ' te dejaron de seguir'}
                </>
              )}
              {gained > 0 && (
                <>
                  {' y ganaste '}
                  <span className="pos">{plural(gained, 'seguidor nuevo', 'seguidores nuevos')}</span>
                </>
              )}
            </h2>
            {(lost > 0 || gained > 0) && (
              <div className="actions">
                {lost > 0 && (
                  <button className="btn" onClick={() => onNavigate('unfollowers')}>Ver quién te dejó de seguir</button>
                )}
                {gained > 0 && (
                  <button className="btn ghost" onClick={() => onNavigate('new')}>Ver seguidores nuevos</button>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="eyebrow">Primera captura · {fmt(curr.capturedAt)}</div>
            <h2 className="big-sentence">Ya tienes tu punto de partida 📸</h2>
            <p className="sub" style={{ margin: 0 }}>
              Para saber quién te deja de seguir hace falta <b>una segunda captura</b>. Vuelve a
              extraer dentro de unos días e impórtala: compararemos las dos.
            </p>
          </>
        )}
        {incomplete && (
          <div className="notice warn">
            ⚠ Alguna de estas capturas está incompleta, así que puede haber unfollowers falsos.
            Revisa el historial en <b>Importar</b>.
          </div>
        )}
      </div>

      <h3 className="section-title">Tu cuenta hoy</h3>
      <div className="stat-grid">
        <StatCard label="Seguidores" value={summary.followers} delta={prev ? summary.delta.followers : null}
          hint="Personas que te siguen." />
        <StatCard label="Seguidos" value={summary.following} delta={prev ? summary.delta.following : null}
          hint="Personas a las que tú sigues." />
        <StatCard label="Mutuos" value={summary.mutual} hint="Os seguís los dos." />
        <StatCard label="No te siguen de vuelta" value={summary.following - summary.mutual} tone="warn"
          hint="Los sigues, pero ellos a ti no." onClick={() => onNavigate('relations')} />
      </div>

      {prev && (
        <>
          <h3 className="section-title">Cambios desde la captura anterior</h3>
          <div className="stat-grid">
            <StatCard label="Te dejaron de seguir" value={lost} tone="neg" onClick={() => onNavigate('unfollowers')} />
            <StatCard label="Seguidores nuevos" value={gained} tone="pos" onClick={() => onNavigate('new')} />
            <StatCard label="Empezaste a seguir" value={changes.iFollowed.length}
              hint="Cuentas que sigues desde entonces." />
            <StatCard label="Dejaste de seguir" value={changes.iUnfollowed.length}
              hint="Cuentas que tú dejaste de seguir." />
          </div>
        </>
      )}

      <div className="panel">
        <h2>Evolución</h2>
        <p className="sub">
          Cada punto es una captura.{snapshots.length < 2 && ' Con más capturas verás la tendencia.'}
        </p>
        <TrendChart data={trend} />
      </div>
    </div>
  )
}

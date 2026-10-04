import { useEffect, useState } from 'react'
import './App.css'
import { getAllSnapshots, saveSnapshot, deleteSnapshot, clearAll } from './lib/db.js'
import { historyUnfollowers, computeRelations, computeChanges } from './lib/diff.js'
import Import from './pages/Import.jsx'
import Overview from './pages/Overview.jsx'
import Unfollowers from './pages/Unfollowers.jsx'
import Relations from './pages/Relations.jsx'
import NewFollowers from './pages/NewFollowers.jsx'
import History from './pages/History.jsx'

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'auto')
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'auto') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])
  const cycle = () => setTheme((t) => (t === 'auto' ? 'light' : t === 'light' ? 'dark' : 'auto'))
  const icon = theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '🌗'
  return { icon, cycle }
}

export default function App() {
  const [snapshots, setSnapshots] = useState([])
  const [tab, setTab] = useState('import')
  const [loaded, setLoaded] = useState(false)
  const { icon, cycle } = useTheme()

  useEffect(() => {
    getAllSnapshots().then((s) => {
      setSnapshots(s)
      setTab(s.length > 0 ? 'overview' : 'import')
      setLoaded(true)
    })
  }, [])

  const onImport = async (snap) => setSnapshots(await saveSnapshot(snap))
  const onDelete = async (at) => setSnapshots(await deleteSnapshot(at))
  const onClear = async () => { await clearAll(); setSnapshots([]) }

  const hasData = snapshots.length > 0
  const curr = hasData ? snapshots[snapshots.length - 1] : null
  const prev = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null

  // Badges para las pestañas
  const badges = hasData
    ? {
        unfollowers: historyUnfollowers(snapshots).length,
        relations: computeRelations(curr).notFollowingBack.length,
        new: prev ? computeChanges(prev, curr).newFollowers.length : 0,
      }
    : {}

  const TABS = [
    { id: 'overview', label: '📊 Resumen', needsData: true },
    { id: 'unfollowers', label: '💔 Te dejaron de seguir', needsData: true, badge: badges.unfollowers },
    { id: 'relations', label: '↩️ No te siguen de vuelta', needsData: true, badge: badges.relations },
    { id: 'new', label: '✨ Seguidores nuevos', needsData: true, badge: badges.new },
    { id: 'history', label: '🕒 Historial', needsData: true },
    { id: 'import', label: hasData ? '📥 Importar' : '📥 Empezar' },
  ]

  return (
    <div className="app">
      <header className="header">
        <div className="logo">👀</div>
        <div>
          <h1>Unfollowing</h1>
          <p>Mide tus seguidores y descubre quién te dejó de seguir · 100% local</p>
        </div>
        <div className="spacer" />
        {hasData && (
          <button className="btn small" onClick={() => setTab('import')} title="Importar una captura nueva">
            + Nueva captura
          </button>
        )}
        <button className="icon-btn" title="Cambiar tema" onClick={cycle}>{icon}</button>
      </header>

      <nav className="tabs">
        {TABS.filter((t) => !t.needsData || hasData).map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.badge > 0 && <span className="badge">{t.badge}</span>}
          </button>
        ))}
      </nav>

      {!loaded ? (
        <div className="empty">Cargando…</div>
      ) : tab === 'import' ? (
        <Import snapshots={snapshots} onImport={onImport} onDelete={onDelete} onClear={onClear} onNavigate={setTab} />
      ) : !hasData ? (
        <div className="empty">Importa una captura para empezar.</div>
      ) : tab === 'overview' ? (
        <Overview snapshots={snapshots} onNavigate={setTab} />
      ) : tab === 'unfollowers' ? (
        <Unfollowers snapshots={snapshots} />
      ) : tab === 'relations' ? (
        <Relations snapshots={snapshots} />
      ) : tab === 'new' ? (
        <NewFollowers snapshots={snapshots} />
      ) : tab === 'history' ? (
        <History snapshots={snapshots} />
      ) : null}
    </div>
  )
}

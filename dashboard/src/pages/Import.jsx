import { useRef, useState } from 'react'
import { parseSnapshot } from '../lib/schema.js'

function fmt(iso) {
  return new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function Import({ snapshots, onImport, onDelete, onClear }) {
  const [drag, setDrag] = useState(false)
  const [notice, setNotice] = useState(null)
  const inputRef = useRef(null)

  async function handleFiles(fileList) {
    const files = Array.from(fileList).filter((f) => f.name.endsWith('.json'))
    if (files.length === 0) {
      setNotice({ type: 'err', text: 'Arrastra un archivo .json exportado por el extractor.' })
      return
    }
    let imported = 0
    let lastErr = null
    for (const file of files) {
      try {
        const raw = JSON.parse(await file.text())
        const res = parseSnapshot(raw)
        if (!res.ok) { lastErr = res.error; continue }
        await onImport(res.snapshot)
        imported++
      } catch {
        lastErr = `No se pudo leer "${file.name}" (¿JSON válido?).`
      }
    }
    if (imported > 0) {
      setNotice({ type: 'ok', text: `Importado ${imported} snapshot(s) correctamente.` })
    } else {
      setNotice({ type: 'err', text: lastErr || 'No se importó nada.' })
    }
  }

  return (
    <div>
      <div className="panel">
        <h2>Importar captura</h2>
        <p className="sub">
          Arrastra el archivo <code>snapshot-*.json</code> que genera el extractor de Chrome.
          Todo se guarda solo en tu navegador.
        </p>
        <div
          className={`dropzone ${drag ? 'drag' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
        >
          <div className="big">📥</div>
          <div>Arrastra aquí tu snapshot, o haz clic para elegir</div>
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
        {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}
      </div>

      <div className="panel">
        <h2>Historial de capturas ({snapshots.length})</h2>
        {snapshots.length === 0 ? (
          <p className="sub">Aún no hay capturas. Importa una para empezar.</p>
        ) : (
          <ul className="snap-list">
            {[...snapshots].reverse().map((s) => (
              <li className="snap-row" key={s.capturedAt}>
                <span>📸 {fmt(s.capturedAt)}</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {s.followers.length} seguidores · {s.following.length} seguidos
                </span>
                <button className="del" title="Borrar" onClick={() => onDelete(s.capturedAt)}>✕</button>
              </li>
            ))}
          </ul>
        )}
        {snapshots.length > 0 && (
          <button className="btn ghost" style={{ marginTop: 14 }} onClick={onClear}>
            🗑 Borrar todo el historial
          </button>
        )}
      </div>
    </div>
  )
}

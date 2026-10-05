import { useEffect, useRef, useState } from 'react'
import { parseSnapshot, incompleteParts } from '../lib/schema.js'

function fmt(iso) {
  return new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function Import({ snapshots, onImport, onDelete, onClear, onNavigate }) {
  const [drag, setDrag] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [notice, setNotice] = useState(null)
  const inputRef = useRef(null)

  // Importa una lista de { name, text }. Comparte lógica entre archivos y portapapeles.
  async function importTexts(items) {
    let imported = 0
    let lastErr = null
    const warnings = []
    for (const { name, text } of items) {
      try {
        const res = parseSnapshot(JSON.parse(text))
        if (!res.ok) { lastErr = res.error; continue }
        await onImport(res.snapshot)
        imported++
        for (const p of incompleteParts(res.snapshot)) {
          warnings.push(`${p.label}: ${p.got} de ${p.expected}`)
        }
      } catch {
        lastErr = `No se pudo leer ${name} (¿es el JSON del extractor?).`
      }
    }
    if (imported === 0) {
      setNotice({ type: 'err', text: lastErr || 'No se importó nada.' })
    } else if (warnings.length > 0) {
      setNotice({
        type: 'warn',
        text: `Importado, pero la captura parece incompleta (${warnings.join(', ')}). ` +
          'Puede mostrar unfollowers falsos: vuelve a extraer y borra esta captura.',
      })
    } else {
      setNotice({ type: 'ok', text: `Importado ${imported} snapshot(s) correctamente.` })
    }
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith('.json'))
    if (files.length === 0) {
      setNotice({ type: 'err', text: 'Arrastra un archivo .json exportado por el extractor.' })
      return
    }
    importTexts(await Promise.all(files.map(async (f) => ({ name: `"${f.name}"`, text: await f.text() }))))
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText()
      importTexts([{ name: 'el portapapeles', text }])
    } catch {
      setNotice({ type: 'err', text: 'El navegador no dejó leer el portapapeles. Prueba con Ctrl+V.' })
    }
  }

  // Ctrl+V en cualquier parte de esta pantalla importa lo copiado desde el extractor.
  useEffect(() => {
    const onPaste = (e) => {
      if (e.target.closest?.('input, textarea')) return
      const text = e.clipboardData?.getData('text')
      if (text?.trim().startsWith('{')) importTexts([{ name: 'el portapapeles', text }])
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  })

  const hasData = snapshots.length > 0
  const nextStep =
    snapshots.length === 0 ? 1 : snapshots.length === 1 ? 3 : 4

  return (
    <div>
      {/* Guía: cómo funciona y en qué paso estás */}
      <div className="panel">
        <h2>{hasData ? 'Cómo funciona' : 'Empieza en 3 pasos'}</h2>
        <p className="sub">Instagram no deja ver esta información directamente, así que la sacamos con una extensión de Chrome y la comparamos aquí.</p>
        <ol className="steps">
          <li className={nextStep === 1 ? 'current' : 'done'}>
            <div className="num">1</div>
            <div>
              <strong>Instala la extensión</strong> (solo la primera vez)
              <details>
                <summary>Ver cómo instalarla</summary>
                <ol className="install">
                  <li>Descarga o clona este proyecto y localiza la carpeta <code>extractor</code>.</li>
                  <li>En Chrome, abre <code>chrome://extensions</code>.</li>
                  <li>Activa <b>Modo de desarrollador</b> (interruptor arriba a la derecha).</li>
                  <li>Pulsa <b>Cargar descomprimida</b> y elige la carpeta <code>extractor</code>.</li>
                  <li>Pulsa el icono de la pieza de puzle 🧩 y fija <b>Unfollowing Extractor</b> 📌 para tenerla a mano.</li>
                </ol>
              </details>
            </div>
          </li>
          <li className={nextStep === 1 ? '' : 'done'}>
            <div className="num">2</div>
            <div>
              <strong>Pulsa «Extraer ahora»</strong> en la extensión, con instagram.com abierto y la sesión iniciada.
              <div className="muted">No cierres el popup hasta que termine; luego pulsa «Descargar snapshot.json».</div>
            </div>
          </li>
          <li className={nextStep === 1 ? '' : 'done'}>
            <div className="num">3</div>
            <div>
              <strong>Impórtalo aquí abajo</strong> arrastrando el archivo o pegándolo.
            </div>
          </li>
          <li className={nextStep === 3 ? 'current' : nextStep === 4 ? 'done' : ''}>
            <div className="num">↻</div>
            <div>
              <strong>Repite cada pocos días.</strong> Comparando capturas vemos quién te dejó de seguir.
              {snapshots.length === 1 && <div className="muted">Tienes 1 captura: con la siguiente ya verás resultados.</div>}
            </div>
          </li>
        </ol>
      </div>

      <div className="panel">
        <h2>Importar captura</h2>
        <p className="sub">Todo se guarda solo en este navegador; no se sube a ningún sitio.</p>
        <div className="import-options">
          <div
            className={`dropzone ${drag ? 'drag' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
          >
            <div className="big">📥</div>
            <strong>Arrastra el archivo aquí</strong>
            <div className="muted">o haz clic para buscar el snapshot-*.json en tu carpeta de Descargas</div>
            <input
              ref={inputRef}
              type="file"
              accept=".json,application/json"
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
          <div className="or">o</div>
          <button className="dropzone paste" onClick={pasteFromClipboard}>
            <div className="big">📋</div>
            <strong>Pegar desde la extensión</strong>
            <div className="muted">Pulsa «Copiar al portapapeles» en la extensión y luego aquí (o Ctrl+V)</div>
          </button>
        </div>
        {notice && (
          <div className={`notice ${notice.type}`}>
            {notice.text}
            {notice.type !== 'err' && hasData && (
              <button className="link-btn" onClick={() => onNavigate('overview')}>Ver resultados →</button>
            )}
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Tus capturas ({snapshots.length})</h2>
        {!hasData ? (
          <p className="sub">Aún no hay capturas.</p>
        ) : (
          <>
            <p className="sub">Cada captura es una foto de tus listas en ese momento. Si una sale incompleta, bórrala y vuelve a extraer.</p>
            <ul className="snap-list">
              {[...snapshots].reverse().map((s, i) => (
                <li className="snap-row" key={s.capturedAt}>
                  <span>📸 {fmt(s.capturedAt)}</span>
                  {i === 0 && <span className="pill">más reciente</span>}
                  {incompleteParts(s).length > 0 && (
                    <span className="incomplete" title="Tiene menos usuarios de los que indica tu perfil: puede generar unfollowers falsos.">
                      ⚠ incompleta
                    </span>
                  )}
                  <span className="muted">
                    {s.followers.length} seguidores · {s.following.length} seguidos
                  </span>
                  <button className="del" title="Borrar esta captura" onClick={() => onDelete(s.capturedAt)}>✕</button>
                </li>
              ))}
            </ul>
            <button
              className="btn ghost danger"
              style={{ marginTop: 14 }}
              onClick={() => (confirmClear ? (onClear(), setConfirmClear(false)) : setConfirmClear(true))}
              onBlur={() => setConfirmClear(false)}
            >
              {confirmClear ? '¿Seguro? Pulsa otra vez para borrarlo todo' : '🗑 Borrar todas las capturas'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

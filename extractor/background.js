// Service worker: orquesta la extracción para que siga aunque cierres el popup.
// El estado vive en chrome.storage.local (el popup solo lo pinta) y, al terminar,
// el snapshot se descarga solo.

const SCHEMA_VERSION = 1
// App id de la web de Instagram (estable desde hace años). Si IG lo cambia, se ajusta aquí.
const IG_APP_ID = '936619743392459'
const DELAY_MIN = 1000
const DELAY_MAX = 2500
// Diferencia tolerada entre lo extraído y el contador del perfil. IG cuenta cuentas
// desactivadas/restringidas que la API no devuelve, así que un pequeño hueco es normal.
const TOLERANCE_ABS = 5
const TOLERANCE_PCT = 0.02

const IDLE = { phase: 'idle', note: '', followers: 0, following: 0, expected: null, error: '', warnings: [] }

async function getState() {
  const { state } = await chrome.storage.local.get('state')
  return state || IDLE
}

// Las escrituras se encolan: llegan mensajes de progreso seguidos y un
// leer-modificar-escribir concurrente perdería actualizaciones.
let queue = Promise.resolve()
function setState(patch) {
  queue = queue.then(async () => {
    const state = { ...(await getState()), ...patch, updatedAt: Date.now() }
    await chrome.storage.local.set({ state })
    return state
  })
  return queue
}

// Sin noticias de la pestaña en este tiempo = la extracción murió (pestaña cerrada, etc.).
// Las esperas por rate limit mandan latidos cada 10s, así que 2 min es holgado.
const STALE_MS = 120000

// ---- Función inyectada en la pestaña de Instagram (corre en su contexto) ----
// Se serializa al inyectarla: no puede usar nada definido fuera de su propio cuerpo.
async function extractInPage({ appId, delayMin, delayMax }) {
  const send = (msg) => {
    try { chrome.runtime.sendMessage(msg).catch(() => {}) } catch { /* extensión recargada */ }
  }
  if (window.__unfollowingRunning) {
    send({ type: 'progress', note: 'Ya hay una extracción en curso en esta pestaña.' })
    return
  }
  window.__unfollowingRunning = true

  const rnd = (a, b) => a + Math.random() * (b - a)
  // Espera en tramos cortos enviando latidos: mantiene vivo el service worker.
  const wait = async (ms, note) => {
    const end = Date.now() + ms
    while (Date.now() < end) {
      if (note) send({ type: 'progress', note: `${note} (${Math.ceil((end - Date.now()) / 1000)}s)` })
      await new Promise((r) => setTimeout(r, Math.min(10000, end - Date.now())))
    }
  }
  const getCookie = (name) => {
    const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')
    return m ? decodeURIComponent(m.pop()) : ''
  }

  try {
    const userId = getCookie('ds_user_id')
    if (!userId) {
      throw new Error('No hay sesión de Instagram. Inicia sesión en instagram.com y vuelve a pulsar Extraer.')
    }
    const headers = {
      'X-IG-App-ID': appId,
      'X-CSRFToken': getCookie('csrftoken'),
      'X-Requested-With': 'XMLHttpRequest',
    }

    // GET con reintentos. Instagram a veces responde 200 con {status:"fail"} cuando
    // limita: antes eso cortaba la lista en silencio y generaba unfollowers falsos.
    async function fetchJson(url) {
      const MAX_TRIES = 6
      for (let attempt = 0; ; attempt++) {
        let res = null
        let data = null
        let problem = ''
        try {
          res = await fetch(url, { headers, credentials: 'include' })
        } catch {
          problem = 'fallo de red'
        }
        if (res) {
          if (res.status === 401 || res.status === 403) {
            throw new Error(`Instagram rechazó la petición (${res.status}). Vuelve a iniciar sesión en instagram.com.`)
          }
          const isJson = (res.headers.get('content-type') || '').includes('json')
          if (res.ok && !isJson) {
            // Redirección a la página de login / checkpoint.
            throw new Error('Instagram pidió verificar la sesión. Abre instagram.com, completa lo que pida y reintenta.')
          }
          if (isJson) data = await res.json().catch(() => null)
          if (data?.message === 'checkpoint_required' || data?.message === 'login_required') {
            throw new Error('Instagram pidió verificar la sesión. Abre instagram.com, completa lo que pida y reintenta.')
          }
          if (res.ok && data && data.status !== 'fail') return data
          problem = res.status === 429 || data?.status === 'fail' ? 'Instagram pidió esperar' : `error ${res.status}`
        }
        if (attempt + 1 >= MAX_TRIES) {
          throw new Error(`Instagram no respondió bien tras varios intentos (${problem}). Prueba de nuevo en un rato.`)
        }
        const backoff = Math.min(300000, 30000 * 2 ** attempt)
        await wait(backoff, `${problem[0].toUpperCase() + problem.slice(1)}. Reintentando`)
      }
    }

    async function fetchList(kind) {
      const byId = new Map() // las páginas de IG a veces se solapan: deduplicamos por id
      let maxId = ''
      const extra = kind === 'followers' ? '&search_surface=follow_list_page' : ''
      while (true) {
        const url =
          `https://www.instagram.com/api/v1/friendships/${userId}/${kind}/?count=50${extra}` +
          (maxId ? `&max_id=${encodeURIComponent(maxId)}` : '')
        const data = await fetchJson(url)
        if (!Array.isArray(data.users)) {
          throw new Error(`Respuesta inesperada de Instagram al pedir ${kind}.`)
        }
        for (const u of data.users) {
          const id = String(u.pk ?? u.pk_id ?? u.id ?? '')
          if (!id) continue
          byId.set(id, {
            id,
            username: u.username || '',
            fullName: u.full_name || '',
            isVerified: !!u.is_verified,
            isPrivate: !!u.is_private,
            profilePic: u.profile_pic_url || '',
          })
        }
        send({ type: 'progress', kind, count: byId.size })
        const next = data.next_max_id ? String(data.next_max_id) : ''
        if (!next || next === maxId) break // fin, o cursor atascado
        maxId = next
        await wait(rnd(delayMin, delayMax))
      }
      return [...byId.values()]
    }

    // Perfil propio: username y contadores oficiales para comprobar que la lista está completa.
    let username = ''
    let expected = null
    try {
      const info = await fetchJson(`https://www.instagram.com/api/v1/users/${userId}/info/`)
      username = info?.user?.username || ''
      if (typeof info?.user?.follower_count === 'number') {
        expected = { followers: info.user.follower_count, following: info.user.following_count }
        send({ type: 'progress', expected })
      }
    } catch { /* no crítico */ }

    send({ type: 'progress', note: 'Extrayendo seguidores…' })
    const followers = await fetchList('followers')
    send({ type: 'progress', note: 'Extrayendo seguidos…' })
    const following = await fetchList('following')

    send({ type: 'done', result: { userId, username, expected, followers, following } })
  } catch (e) {
    send({ type: 'error', error: e?.message || String(e) })
  } finally {
    window.__unfollowingRunning = false
  }
}

function isIncomplete(got, expected) {
  if (typeof expected !== 'number') return false
  return expected - got > Math.max(TOLERANCE_ABS, expected * TOLERANCE_PCT)
}

async function downloadSnapshot(snapshot) {
  const stamp = snapshot.capturedAt.slice(0, 16).replace('T', '_').replace(':', 'h')
  const json = JSON.stringify(snapshot)
  // En un service worker no hay URL.createObjectURL: usamos un data URL.
  const url = 'data:application/json;charset=utf-8,' + encodeURIComponent(json)
  await chrome.downloads.download({ url, filename: `unfollowing/snapshot-${stamp}.json`, conflictAction: 'uniquify' })
}

async function findOrOpenInstagramTab() {
  const tabs = await chrome.tabs.query({ url: 'https://www.instagram.com/*' })
  const tab = tabs.find((t) => t.active) || tabs[0]
  if (tab) return tab
  const created = await chrome.tabs.create({ url: 'https://www.instagram.com/', active: false })
  // Espera a que cargue para poder inyectar.
  await new Promise((resolve) => {
    const listener = (id, info) => {
      if (id === created.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener)
        resolve()
      }
    }
    chrome.tabs.onUpdated.addListener(listener)
  })
  return created
}

async function startExtraction() {
  const state = await getState()
  if (state.phase === 'running' && Date.now() - (state.updatedAt || 0) < STALE_MS) return
  await setState({ ...IDLE, phase: 'running', note: 'Buscando pestaña de Instagram…', startedAt: Date.now() })
  try {
    const tab = await findOrOpenInstagramTab()
    await setState({ note: 'Conectando con tu sesión…' })
    // No esperamos el resultado aquí: la página lo envía con un mensaje 'done'.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'ISOLATED',
      func: extractInPage,
      args: [{ appId: IG_APP_ID, delayMin: DELAY_MIN, delayMax: DELAY_MAX }],
    })
  } catch (e) {
    await setState({ phase: 'error', error: e?.message || String(e) })
  }
}

async function finish(result) {
  const snapshot = {
    schemaVersion: SCHEMA_VERSION,
    capturedAt: new Date().toISOString(),
    source: 'chrome-extension',
    account: {
      userId: result.userId,
      username: result.username,
      ...(result.expected && {
        followerCount: result.expected.followers,
        followingCount: result.expected.following,
      }),
    },
    followers: result.followers,
    following: result.following,
  }
  const warnings = []
  if (isIncomplete(result.followers.length, result.expected?.followers)) {
    warnings.push(`Seguidores: se obtuvieron ${result.followers.length} de ${result.expected.followers}. Puede que Instagram haya limitado la extracción; si comparas con esta captura podrías ver unfollowers falsos. Prueba a extraer otra vez más tarde.`)
  }
  if (isIncomplete(result.following.length, result.expected?.following)) {
    warnings.push(`Seguidos: se obtuvieron ${result.following.length} de ${result.expected.following}.`)
  }
  await chrome.storage.local.set({ lastSnapshot: snapshot })
  await setState({
    phase: 'done',
    note: '',
    followers: result.followers.length,
    following: result.following.length,
    expected: result.expected,
    warnings,
    finishedAt: Date.now(),
  })
  try {
    await downloadSnapshot(snapshot)
  } catch (e) {
    await setState({ warnings: [...warnings, 'No se pudo descargar automáticamente: usa el botón Descargar.'] })
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'start') {
    startExtraction()
  } else if (msg?.type === 'download') {
    chrome.storage.local.get('lastSnapshot').then(({ lastSnapshot }) => lastSnapshot && downloadSnapshot(lastSnapshot))
  } else if (msg?.type === 'progress') {
    const patch = {}
    if (msg.note) patch.note = msg.note
    if (msg.kind === 'followers') patch.followers = msg.count
    if (msg.kind === 'following') patch.following = msg.count
    if (msg.expected) patch.expected = msg.expected
    setState(patch)
  } else if (msg?.type === 'done') {
    finish(msg.result)
  } else if (msg?.type === 'error') {
    setState({ phase: 'error', error: msg.error, note: '' })
  }
  sendResponse?.()
})

// Si Chrome se reinició a mitad de una extracción, no dejamos el popup colgado en "running".
chrome.runtime.onStartup.addListener(async () => {
  const state = await getState()
  if (state.phase === 'running') await setState({ phase: 'error', error: 'La extracción se interrumpió. Vuelve a pulsar Extraer.' })
})

// Orquesta la extracción: encuentra la pestaña de Instagram, inyecta el extractor
// (que corre con TU sesión), recibe el progreso y arma el snapshot.

const SCHEMA_VERSION = 1
// App id de la web de Instagram (estable desde hace años). Si IG lo cambia, se ajusta aquí.
const IG_APP_ID = '936619743392459'
const DELAY_MIN = 800
const DELAY_MAX = 2000

const $ = (id) => document.getElementById(id)
let lastSnapshot = null

function setStatus(text, cls = '') {
  const el = $('status')
  el.textContent = text
  el.className = cls
}

// ---- Función inyectada en la pestaña de Instagram (corre en su contexto) ----
async function extractInPage({ appId, delayMin, delayMax }) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const rnd = (a, b) => a + Math.random() * (b - a)
  const getCookie = (name) => {
    const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')
    return m ? decodeURIComponent(m.pop()) : ''
  }
  const send = (msg) => { try { chrome.runtime.sendMessage(msg) } catch (e) { /* popup cerrado */ } }

  const userId = getCookie('ds_user_id')
  const csrf = getCookie('csrftoken')
  if (!userId) {
    throw new Error('No hay sesión de Instagram (falta la cookie ds_user_id). Inicia sesión en instagram.com.')
  }

  const headers = {
    'X-IG-App-ID': appId,
    'X-CSRFToken': csrf,
    'X-Requested-With': 'XMLHttpRequest',
  }

  async function fetchList(kind) {
    const out = []
    let maxId = ''
    let page = 0
    while (true) {
      const url =
        `https://www.instagram.com/api/v1/friendships/${userId}/${kind}/?count=50` +
        (maxId ? `&max_id=${encodeURIComponent(maxId)}` : '')
      let res
      try {
        res = await fetch(url, { headers, credentials: 'include' })
      } catch (e) {
        throw new Error('Fallo de red al pedir ' + kind + '.')
      }
      if (res.status === 429) {
        send({ type: 'progress', note: 'Instagram pidió esperar (rate limit). Reintentando en 30s…' })
        await sleep(30000)
        continue
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error('Instagram rechazó la petición (' + res.status + '). ¿Sesión caducada?')
      }
      if (!res.ok) throw new Error('Instagram respondió ' + res.status + ' al pedir ' + kind + '.')

      const data = await res.json()
      for (const u of data.users || []) {
        out.push({
          id: String(u.pk || u.pk_id || u.id),
          username: u.username || '',
          fullName: u.full_name || '',
          isVerified: !!u.is_verified,
          isPrivate: !!u.is_private,
          profilePic: u.profile_pic_url || '',
        })
      }
      page++
      send({ type: 'progress', kind, count: out.length })
      maxId = data.next_max_id
      if (!maxId) break
      await sleep(rnd(delayMin, delayMax))
    }
    return out
  }

  // Nombre de usuario propio (best-effort, no crítico).
  let username = ''
  try {
    const r = await fetch(`https://www.instagram.com/api/v1/users/${userId}/info/`, { headers, credentials: 'include' })
    if (r.ok) username = (await r.json())?.user?.username || ''
  } catch (e) { /* ignorar */ }

  send({ type: 'progress', note: 'Extrayendo seguidores…' })
  const followers = await fetchList('followers')
  send({ type: 'progress', note: 'Extrayendo seguidos…' })
  const following = await fetchList('following')

  return { userId, username, followers, following }
}

// ---- Recibe progreso de la función inyectada ----
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== 'progress') return
  if (msg.note) setStatus(msg.note)
  if (msg.kind === 'followers') $('nFollowers').textContent = msg.count
  if (msg.kind === 'following') $('nFollowing').textContent = msg.count
})

async function findInstagramTab() {
  const tabs = await chrome.tabs.query({ url: 'https://www.instagram.com/*' })
  if (tabs.length === 0) return null
  // Prioriza la activa
  return tabs.find((t) => t.active) || tabs[0]
}

$('extract').addEventListener('click', async () => {
  $('extract').disabled = true
  $('counts').style.display = 'flex'
  $('nFollowers').textContent = '0'
  $('nFollowing').textContent = '0'
  setStatus('Buscando pestaña de Instagram…')

  const tab = await findInstagramTab()
  if (!tab) {
    setStatus('Abre instagram.com (con sesión iniciada) en una pestaña y reintenta.', 'err')
    $('extract').disabled = false
    return
  }

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'ISOLATED',
      func: extractInPage,
      args: [{ appId: IG_APP_ID, delayMin: DELAY_MIN, delayMax: DELAY_MAX }],
    })

    lastSnapshot = {
      schemaVersion: SCHEMA_VERSION,
      capturedAt: new Date().toISOString(),
      source: 'chrome-extension',
      account: { userId: result.userId, username: result.username },
      followers: result.followers,
      following: result.following,
    }

    setStatus(
      `Listo: ${result.followers.length} seguidores, ${result.following.length} seguidos.`,
      'ok',
    )
    $('download').style.display = 'block'
    $('copy').style.display = 'block'
  } catch (e) {
    setStatus('Error: ' + (e?.message || e), 'err')
  } finally {
    $('extract').disabled = false
  }
})

$('download').addEventListener('click', () => {
  if (!lastSnapshot) return
  const stamp = lastSnapshot.capturedAt.slice(0, 10)
  const blob = new Blob([JSON.stringify(lastSnapshot, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `snapshot-${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
})

$('copy').addEventListener('click', async () => {
  if (!lastSnapshot) return
  await navigator.clipboard.writeText(JSON.stringify(lastSnapshot))
  setStatus('Snapshot copiado al portapapeles.', 'ok')
})

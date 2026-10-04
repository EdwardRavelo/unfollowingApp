// El popup solo pinta el estado que guarda el service worker (background.js)
// y le manda órdenes. Puedes cerrarlo a mitad de extracción sin perder nada.

const $ = (id) => document.getElementById(id)

function fmtCount(id, got, expected) {
  $('n' + id).textContent = got
  $('e' + id).textContent = typeof expected === 'number' ? ` / ${expected}` : ''
  const pct = typeof expected === 'number' && expected > 0 ? Math.min(100, (got / expected) * 100) : 0
  $('b' + id).style.width = pct + '%'
}

function setSteps(active) {
  for (const n of [1, 2, 3]) {
    $('s' + n).className = 'step' + (n < active ? ' done' : n === active ? ' active' : '')
  }
}

function render(state) {
  const phase = state.phase || 'idle'
  for (const v of ['idle', 'running', 'done', 'error']) $('v-' + v).hidden = v !== phase
  setSteps(phase === 'done' ? 3 : 1)

  if (phase === 'running') {
    fmtCount('Followers', state.followers || 0, state.expected?.followers)
    fmtCount('Following', state.following || 0, state.expected?.following)
    $('note').textContent = state.note || ''
  }

  if (phase === 'done') {
    $('doneText').textContent =
      `${state.followers} seguidores y ${state.following} seguidos guardados en ` +
      'Descargas/unfollowing. Ahora ábrelo en el dashboard.'
    $('warnings').replaceChildren(
      ...(state.warnings || []).map((w) => {
        const div = document.createElement('div')
        div.className = 'warn'
        div.textContent = '⚠ ' + w
        return div
      }),
    )
  }

  if (phase === 'error') $('errorText').textContent = state.error
}

chrome.storage.local.get('state').then(({ state }) => render(state || { phase: 'idle' }))
chrome.storage.onChanged.addListener((changes) => {
  if (changes.state) render(changes.state.newValue)
})

const start = () => chrome.runtime.sendMessage({ type: 'start' })
$('extract').addEventListener('click', start)
$('retry').addEventListener('click', start)
$('again').addEventListener('click', start)
$('download').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'download' }))

$('copy').addEventListener('click', async () => {
  const { lastSnapshot } = await chrome.storage.local.get('lastSnapshot')
  if (!lastSnapshot) return
  await navigator.clipboard.writeText(JSON.stringify(lastSnapshot))
  $('copy').textContent = '✔ Copiado. Pégalo en «Importar» del dashboard'
})

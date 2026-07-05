// Corazón del producto: compara snapshots y deriva las métricas de relación.
// Toda la comparación se hace por `id` (estable), nunca por username.

/** Convierte un array de usuarios en un Map por id para lookups O(1). */
function byId(users) {
  const m = new Map()
  for (const u of users) m.set(u.id, u)
  return m
}

/**
 * Relaciones DENTRO de un mismo snapshot (estado actual):
 *  - notFollowingBack: los sigues pero NO te siguen (following − followers)
 *  - notFollowedBack:  te siguen pero NO los sigues (followers − following)
 *  - mutual:           os seguís mutuamente
 */
export function computeRelations(snapshot) {
  const followers = byId(snapshot.followers)
  const following = byId(snapshot.following)

  const notFollowingBack = []
  const mutual = []
  for (const u of snapshot.following) {
    if (followers.has(u.id)) mutual.push(u)
    else notFollowingBack.push(u)
  }
  const notFollowedBack = snapshot.followers.filter((u) => !following.has(u.id))

  return { notFollowingBack, notFollowedBack, mutual }
}

/**
 * Cambios ENTRE dos snapshots (prev → curr):
 *  - unfollowers: estaban en followers antes y ya no (te dejaron de seguir)
 *  - newFollowers: aparecen en followers ahora y no antes
 *  - iUnfollowed: dejaste de seguir (estaban en following antes, ya no)
 *  - iFollowed: empezaste a seguir
 * `detectedAt` = capturedAt del snapshot actual (cuándo lo detectamos).
 */
export function computeChanges(prev, curr) {
  if (!prev) {
    return { unfollowers: [], newFollowers: [], iUnfollowed: [], iFollowed: [], detectedAt: curr.capturedAt }
  }
  const prevFollowers = byId(prev.followers)
  const currFollowers = byId(curr.followers)
  const prevFollowing = byId(prev.following)
  const currFollowing = byId(curr.following)
  const detectedAt = curr.capturedAt

  const stamp = (u) => ({ ...u, detectedAt })

  const unfollowers = prev.followers.filter((u) => !currFollowers.has(u.id)).map(stamp)
  const newFollowers = curr.followers.filter((u) => !prevFollowers.has(u.id)).map(stamp)
  const iUnfollowed = prev.following.filter((u) => !currFollowing.has(u.id)).map(stamp)
  const iFollowed = curr.following.filter((u) => !prevFollowing.has(u.id)).map(stamp)

  return { unfollowers, newFollowers, iUnfollowed, iFollowed, detectedAt }
}

/**
 * Recorre TODO el historial (ordenado por fecha) y acumula los unfollowers
 * detectados en cada transición, con la fecha en que se detectaron.
 * Útil para "unfollowers recientes" aunque haya varias capturas.
 */
export function historyUnfollowers(snapshots) {
  const sorted = [...snapshots].sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt))
  const all = []
  for (let i = 1; i < sorted.length; i++) {
    const { unfollowers } = computeChanges(sorted[i - 1], sorted[i])
    all.push(...unfollowers)
  }
  // más recientes primero
  return all.sort((a, b) => Date.parse(b.detectedAt) - Date.parse(a.detectedAt))
}

/** Serie temporal para gráficos: [{ date, followers, following, mutual }]. */
export function buildTrend(snapshots) {
  return [...snapshots]
    .sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt))
    .map((s) => {
      const { mutual } = computeRelations(s)
      return {
        date: s.capturedAt,
        followers: s.followers.length,
        following: s.following.length,
        mutual: mutual.length,
      }
    })
}

/** Métricas de resumen para la portada, con deltas vs. el snapshot anterior. */
export function computeSummary(curr, prev) {
  const { mutual } = computeRelations(curr)
  const followers = curr.followers.length
  const following = curr.following.length
  const ratio = following === 0 ? followers : followers / following
  const delta = prev
    ? { followers: followers - prev.followers.length, following: following - prev.following.length }
    : { followers: 0, following: 0 }
  return { followers, following, mutual: mutual.length, ratio, delta }
}

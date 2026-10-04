// Validación y normalización de snapshots importados.
// El contrato completo está documentado en /SNAPSHOT_FORMAT.md

export const SCHEMA_VERSION = 1

/** Quita usuarios repetidos (mismo id) y entradas sin id. */
function dedupe(users) {
  const m = new Map()
  for (const u of users) if (u.id) m.set(u.id, u)
  return [...m.values()]
}

/** Normaliza un objeto User asegurando tipos y defaults seguros. */
function normalizeUser(u) {
  return {
    id: u.id == null ? '' : String(u.id),
    username: String(u.username ?? ''),
    fullName: u.fullName ?? '',
    isVerified: Boolean(u.isVerified),
    isPrivate: Boolean(u.isPrivate),
    profilePic: u.profilePic ?? '',
  }
}

function optionalCount(n) {
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

/**
 * ¿La captura trae menos usuarios de los que dice el perfil? IG cuenta cuentas
 * desactivadas que la API no devuelve, así que toleramos un pequeño hueco.
 * Devuelve la lista de faltantes por tipo, vacía si está completa o no se sabe.
 */
export function incompleteParts(snapshot) {
  const parts = []
  const check = (label, got, expected) => {
    if (expected == null) return
    if (expected - got > Math.max(5, expected * 0.02)) parts.push({ label, got, expected })
  }
  check('seguidores', snapshot.followers.length, snapshot.account?.followerCount)
  check('seguidos', snapshot.following.length, snapshot.account?.followingCount)
  return parts
}

/**
 * Valida y normaliza un snapshot crudo (parseado de JSON).
 * Devuelve { ok: true, snapshot } o { ok: false, error }.
 */
export function parseSnapshot(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'El archivo no es un objeto JSON válido.' }
  }
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Versión de esquema no soportada (${raw.schemaVersion}). Se esperaba ${SCHEMA_VERSION}.`,
    }
  }
  if (!Array.isArray(raw.followers) || !Array.isArray(raw.following)) {
    return { ok: false, error: 'Faltan las listas "followers" y/o "following".' }
  }
  const capturedAt = raw.capturedAt || new Date().toISOString()
  if (Number.isNaN(Date.parse(capturedAt))) {
    return { ok: false, error: 'La fecha "capturedAt" no es válida.' }
  }

  return {
    ok: true,
    snapshot: {
      schemaVersion: SCHEMA_VERSION,
      capturedAt,
      source: raw.source ?? 'manual',
      account: {
        userId: String(raw.account?.userId ?? ''),
        username: String(raw.account?.username ?? ''),
        followerCount: optionalCount(raw.account?.followerCount),
        followingCount: optionalCount(raw.account?.followingCount),
      },
      followers: dedupe(raw.followers.map(normalizeUser)),
      following: dedupe(raw.following.map(normalizeUser)),
    },
  }
}

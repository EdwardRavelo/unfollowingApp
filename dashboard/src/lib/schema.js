// Validación y normalización de snapshots importados.
// El contrato completo está documentado en /SNAPSHOT_FORMAT.md

export const SCHEMA_VERSION = 1

/** Normaliza un objeto User asegurando tipos y defaults seguros. */
function normalizeUser(u) {
  return {
    id: String(u.id),
    username: String(u.username ?? ''),
    fullName: u.fullName ?? '',
    isVerified: Boolean(u.isVerified),
    isPrivate: Boolean(u.isPrivate),
    profilePic: u.profilePic ?? '',
  }
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
      },
      followers: raw.followers.map(normalizeUser),
      following: raw.following.map(normalizeUser),
    },
  }
}

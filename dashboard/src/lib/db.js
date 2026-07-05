// Wrapper de IndexedDB para el historial de snapshots. Todo local en el navegador.
import { openDB } from 'idb'

const DB_NAME = 'unfollowing'
const DB_VERSION = 1
const STORE = 'snapshots'

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        // clave = capturedAt (ISO string). Un índice por fecha para ordenar.
        const store = db.createObjectStore(STORE, { keyPath: 'capturedAt' })
        store.createIndex('capturedAt', 'capturedAt')
      }
    },
  })
}

/** Guarda un snapshot (idempotente por capturedAt). Devuelve la lista actualizada. */
export async function saveSnapshot(snapshot) {
  const db = await getDB()
  await db.put(STORE, snapshot)
  return getAllSnapshots()
}

/** Todos los snapshots, ordenados por fecha ascendente. */
export async function getAllSnapshots() {
  const db = await getDB()
  const all = await db.getAll(STORE)
  return all.sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt))
}

/** Borra un snapshot por su capturedAt. */
export async function deleteSnapshot(capturedAt) {
  const db = await getDB()
  await db.delete(STORE, capturedAt)
  return getAllSnapshots()
}

/** Borra TODO el historial. */
export async function clearAll() {
  const db = await getDB()
  await db.clear(STORE)
}

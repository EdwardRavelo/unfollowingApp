import { describe, it, expect } from 'vitest'
import { parseSnapshot, incompleteParts } from './schema.js'

const raw = (extra = {}) => ({
  schemaVersion: 1,
  capturedAt: '2026-01-01T00:00:00Z',
  account: { userId: '1', username: 'me' },
  followers: [],
  following: [],
  ...extra,
})

describe('parseSnapshot', () => {
  it('quita usuarios duplicados y sin id', () => {
    const res = parseSnapshot(raw({
      followers: [{ id: 'a', username: 'ana' }, { id: 'a', username: 'ana' }, { username: 'sin_id' }],
    }))
    expect(res.ok).toBe(true)
    expect(res.snapshot.followers.map((u) => u.id)).toEqual(['a'])
  })

  it('conserva los contadores del perfil si vienen', () => {
    const res = parseSnapshot(raw({ account: { userId: '1', username: 'me', followerCount: 10, followingCount: 'x' } }))
    expect(res.snapshot.account.followerCount).toBe(10)
    expect(res.snapshot.account.followingCount).toBeUndefined()
  })
})

describe('incompleteParts', () => {
  const users = (n) => Array.from({ length: n }, (_, i) => ({ id: String(i), username: 'u' + i }))

  it('marca una captura con muchos menos seguidores que el perfil', () => {
    const { snapshot } = parseSnapshot(raw({ followers: users(500), account: { followerCount: 1000 } }))
    expect(incompleteParts(snapshot)).toEqual([{ label: 'seguidores', got: 500, expected: 1000 }])
  })

  it('tolera el pequeño hueco normal (cuentas desactivadas)', () => {
    const { snapshot } = parseSnapshot(raw({ followers: users(990), account: { followerCount: 1000 } }))
    expect(incompleteParts(snapshot)).toEqual([])
  })

  it('sin contadores no opina', () => {
    const { snapshot } = parseSnapshot(raw({ followers: users(1) }))
    expect(incompleteParts(snapshot)).toEqual([])
  })
})

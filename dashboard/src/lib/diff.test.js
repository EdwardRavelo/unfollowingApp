import { describe, it, expect } from 'vitest'
import { computeRelations, computeChanges, historyUnfollowers, computeSummary } from './diff.js'

const u = (id, username, extra = {}) => ({ id, username, fullName: '', isVerified: false, isPrivate: false, profilePic: '', ...extra })

const snap = (capturedAt, followers, following) => ({
  schemaVersion: 1,
  capturedAt,
  source: 'test',
  account: { userId: '1', username: 'me' },
  followers,
  following,
})

describe('computeRelations', () => {
  it('clasifica mutuos, no-te-siguen y no-los-sigues', () => {
    const s = snap('2026-01-01T00:00:00Z', [u('a', 'ana'), u('b', 'beto')], [u('a', 'ana'), u('c', 'caro')])
    const r = computeRelations(s)
    expect(r.mutual.map((x) => x.id)).toEqual(['a'])
    expect(r.notFollowingBack.map((x) => x.id)).toEqual(['c']) // sigo a caro, no me sigue
    expect(r.notFollowedBack.map((x) => x.id)).toEqual(['b']) // beto me sigue, no lo sigo
  })
})

describe('computeChanges', () => {
  it('detecta unfollowers y nuevos seguidores', () => {
    const prev = snap('2026-01-01T00:00:00Z', [u('a', 'ana'), u('b', 'beto')], [])
    const curr = snap('2026-01-02T00:00:00Z', [u('a', 'ana'), u('c', 'caro')], [])
    const c = computeChanges(prev, curr)
    expect(c.unfollowers.map((x) => x.id)).toEqual(['b']) // beto dejó de seguir
    expect(c.newFollowers.map((x) => x.id)).toEqual(['c']) // caro es nuevo
    expect(c.unfollowers[0].detectedAt).toBe('2026-01-02T00:00:00Z')
  })

  it('un cambio de username NO cuenta como unfollow (compara por id)', () => {
    const prev = snap('2026-01-01T00:00:00Z', [u('a', 'ana')], [])
    const curr = snap('2026-01-02T00:00:00Z', [u('a', 'ana_nueva')], []) // mismo id, otro username
    const c = computeChanges(prev, curr)
    expect(c.unfollowers).toHaveLength(0)
    expect(c.newFollowers).toHaveLength(0)
  })

  it('sin snapshot previo no hay cambios', () => {
    const curr = snap('2026-01-02T00:00:00Z', [u('a', 'ana')], [])
    const c = computeChanges(null, curr)
    expect(c.unfollowers).toHaveLength(0)
  })
})

describe('historyUnfollowers', () => {
  it('acumula unfollowers a través de varias capturas, más recientes primero', () => {
    const s1 = snap('2026-01-01T00:00:00Z', [u('a', 'ana'), u('b', 'beto')], [])
    const s2 = snap('2026-01-02T00:00:00Z', [u('a', 'ana')], []) // beto se va
    const s3 = snap('2026-01-03T00:00:00Z', [], []) // ana se va
    const list = historyUnfollowers([s3, s1, s2]) // desordenado a propósito
    expect(list.map((x) => x.id)).toEqual(['a', 'b']) // ana (más reciente) primero
    expect(list[0].detectedAt).toBe('2026-01-03T00:00:00Z')
  })
})

describe('computeSummary', () => {
  it('calcula conteos, ratio y deltas', () => {
    const prev = snap('2026-01-01T00:00:00Z', [u('a', 'ana')], [u('a', 'ana'), u('b', 'beto')])
    const curr = snap('2026-01-02T00:00:00Z', [u('a', 'ana'), u('c', 'caro')], [u('a', 'ana')])
    const sum = computeSummary(curr, prev)
    expect(sum.followers).toBe(2)
    expect(sum.following).toBe(1)
    expect(sum.mutual).toBe(1)
    expect(sum.ratio).toBe(2)
    expect(sum.delta).toEqual({ followers: 1, following: -1 })
  })
})

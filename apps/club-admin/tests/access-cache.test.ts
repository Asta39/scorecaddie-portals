import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  ACCESS_TTL_MS, cacheAccess, clearAccessCache, forgetAccess, isAccessCached,
} from '../lib/access-cache'

beforeEach(() => clearAccessCache())

test('unknown user is not cached', () => {
  assert.equal(isAccessCached('u1'), false)
})

test('cached user is allowed until the TTL passes', () => {
  const t0 = 1_000_000
  cacheAccess('u1', t0)
  assert.equal(isAccessCached('u1', t0 + ACCESS_TTL_MS - 1), true)
  assert.equal(isAccessCached('u1', t0 + ACCESS_TTL_MS), false)
  // Expired entries are removed, not resurrected.
  assert.equal(isAccessCached('u1', t0), false)
})

test('forgetAccess revokes immediately', () => {
  cacheAccess('u1')
  forgetAccess('u1')
  assert.equal(isAccessCached('u1'), false)
})

test('users are cached independently', () => {
  cacheAccess('u1')
  assert.equal(isAccessCached('u2'), false)
})

test('cache is bounded and evicts the oldest entry', () => {
  const t0 = 1_000_000
  for (let i = 0; i < 5_000; i++) cacheAccess(`u${i}`, t0)
  cacheAccess('newest', t0)
  assert.equal(isAccessCached('u0', t0), false)
  assert.equal(isAccessCached('u1', t0), true)
  assert.equal(isAccessCached('newest', t0), true)
})

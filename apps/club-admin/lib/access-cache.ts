// Short-lived, per-instance cache of "is this user allowed into the portal".
//
// The proxy runs on every request (pages, RSC payloads, prefetches, API
// routes). Checking the user's role in the database each time costs one or
// two round trips per request. Positive answers are cached briefly; denials
// are never cached, so a newly granted admin gets in immediately.
//
// Trade-off: revoking an admin takes effect within TTL_MS on a warm instance.
// Row-level security still applies to every query, so a revoked admin can't
// read or write club data in that window, only load page shells.

export const ACCESS_TTL_MS = 60_000
const MAX_ENTRIES = 5_000

const allowed = new Map<string, number>()

export function isAccessCached(userId: string, now = Date.now()): boolean {
  const expiresAt = allowed.get(userId)
  if (expiresAt === undefined) return false
  if (expiresAt <= now) {
    allowed.delete(userId)
    return false
  }
  return true
}

export function cacheAccess(userId: string, now = Date.now()): void {
  if (allowed.size >= MAX_ENTRIES) {
    // Drop the oldest insertion; Map preserves insertion order.
    const oldest = allowed.keys().next().value
    if (oldest !== undefined) allowed.delete(oldest)
  }
  allowed.delete(userId)
  allowed.set(userId, now + ACCESS_TTL_MS)
}

export function forgetAccess(userId: string): void {
  allowed.delete(userId)
}

export function clearAccessCache(): void {
  allowed.clear()
}

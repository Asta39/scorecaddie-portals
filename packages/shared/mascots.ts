/**
 * Club mascots. The first 18 are the bot-avatars types; the rest are
 * ScoreCaddie's own shapes drawn with the same renderer. Each club holds one,
 * and clubs.mascot is unique, so no two clubs share a mascot.
 *
 * Images live in each portal's public/mascots/<key>-<mood>.webp.
 */
export const MASCOTS = [
  { key: 'clover', label: 'Clover', color: '#35B8FF' },
  { key: 'flower', label: 'Flower', color: '#2FCB7A' },
  { key: 'triangle', label: 'Triangle', color: '#DC48FF' },
  { key: 'square', label: 'Square', color: '#35B8FF' },
  { key: 'blob', label: 'Blob', color: '#2FCB7A' },
  { key: 'ghost', label: 'Ghost', color: '#F4F2FA' },
  { key: 'circle', label: 'Circle', color: '#9A62FF' },
  { key: 'drop', label: 'Drop', color: '#1ED3C6' },
  { key: 'star', label: 'Star', color: '#FFD32B' },
  { key: 'droid', label: 'Droid', color: '#D5DBEA' },
  { key: 'mech', label: 'Mech', color: '#95A6C4' },
  { key: 'alien', label: 'Alien', color: '#9BE85A' },
  { key: 'hexagon', label: 'Hexagon', color: '#FF2A2A' },
  { key: 'cat', label: 'Cat', color: '#FF8C42' },
  { key: 'cloud', label: 'Cloud', color: '#CFE6FF' },
  { key: 'pill', label: 'Pill', color: '#7B77F0' },
  { key: 'pebble', label: 'Pebble', color: '#2FCB7A' },
  { key: 'puddle', label: 'Puddle', color: '#FF2A2A' },
  { key: 'bear', label: 'Bear', color: '#B07A4F' },
  { key: 'bunny', label: 'Bunny', color: '#F2E8DC' },
  { key: 'frog', label: 'Frog', color: '#5CC46A' },
  { key: 'mouse', label: 'Mouse', color: '#B9BEC8' },
  { key: 'elephant', label: 'Elephant', color: '#9AA6B8' },
  { key: 'lion', label: 'Lion', color: '#E8A33A' },
  { key: 'hippo', label: 'Hippo', color: '#C79AC9' },
  { key: 'chick', label: 'Chick', color: '#FFD84D' },
  { key: 'mushroom', label: 'Mushroom', color: '#E2574C' },
  { key: 'acorn', label: 'Acorn', color: '#C98B4A' },
  { key: 'heart', label: 'Heart', color: '#F06292' },
  { key: 'sun', label: 'Sun', color: '#FFB020' },
  { key: 'moon', label: 'Moon', color: '#F3E7B3' },
  { key: 'bell', label: 'Bell', color: '#F2C14E' },
  { key: 'tulip', label: 'Tulip', color: '#FF6F91' },
  { key: 'jelly', label: 'Jelly', color: '#B388FF' },
  { key: 'cactus', label: 'Cactus', color: '#43A047' },
  { key: 'lemon', label: 'Lemon', color: '#E9E24A' },
  { key: 'apple', label: 'Apple', color: '#E53935' },
  { key: 'kite', label: 'Kite', color: '#26C6DA' },
  { key: 'bean', label: 'Bean', color: '#8BC34A' },
  { key: 'whale', label: 'Whale', color: '#3F7BD9' },
  { key: 'snail', label: 'Snail', color: '#D4A373' },
  { key: 'rhino', label: 'Rhino', color: '#8D99AE' },
] as const

export type MascotKey = (typeof MASCOTS)[number]['key']
export type MascotMood = 'idle' | 'work' | 'sleep'

export const MASCOT_KEYS: readonly string[] = MASCOTS.map(m => m.key)

export function isMascotKey(value: unknown): value is MascotKey {
  return typeof value === 'string' && MASCOT_KEYS.includes(value)
}

export function mascotLabel(key: string | null | undefined): string {
  return MASCOTS.find(m => m.key === key)?.label ?? 'Score Caddie'
}

/** Path of a mascot image; falls back to the clover when a club has none. */
export function mascotSrc(key: string | null | undefined, mood: MascotMood = 'idle'): string {
  return `/mascots/${isMascotKey(key) ? key : 'clover'}-${mood}.webp`
}

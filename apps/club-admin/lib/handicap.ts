// World Handicap System course and playing handicap.
//
//   Course Handicap  = Handicap Index × (Slope / 113) + (Course Rating − Par)
//   Playing Handicap = Course Handicap × allowance
//
// Both are rounded to the nearest whole number for display. Per the WHS
// rules, Playing Handicap is computed from the UNROUNDED Course Handicap.

export type HandicapTee = {
  courseRating: number
  slopeRating: number
  par: number
}

export type Handicaps = { hi: number; ch: number; ph: number }

export function computeHandicaps(
  hi: number | null | undefined,
  tee: HandicapTee | null,
  allowancePct: number,
): Handicaps | null {
  if (hi == null || !tee) return null
  const ch = hi * (tee.slopeRating / 113) + (tee.courseRating - tee.par)
  return { hi, ch: Math.round(ch), ph: Math.round((ch * allowancePct) / 100) }
}

// Plus handicaps are stored negative but written "+2.0" in golf.
const fmt = (n: number, dp: number) => (n < 0 ? `+${(-n).toFixed(dp)}` : n.toFixed(dp))

/** "HI:36.1 CH:40 PH:38", or just the HI when the tee isn't configured. */
export function formatHandicaps(hi: number | null | undefined, h: Handicaps | null) {
  if (h) return `HI:${fmt(h.hi, 1)} CH:${fmt(h.ch, 0)} PH:${fmt(h.ph, 0)}`
  if (hi != null) return `HI:${fmt(hi, 1)}`
  return ''
}

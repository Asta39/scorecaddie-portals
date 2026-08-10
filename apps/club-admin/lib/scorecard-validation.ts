// Validation for club-supplied scorecards.
//
// Mirrors tool/course_data/validate_courses.py in the mobile repo. These rules
// exist because the data they replace was synthetic: stroke index was set to
// the hole number (SI 1..18 in play order) and the yardages were admitted
// estimates. Since scorecards feed WHS handicap maths, a card cannot be
// marked verified unless it passes every hard check here.

export type HoleRow = {
  holeNumber: number
  par: number | null
  si: number | null
  /** yardage per tee id */
  yardages: Record<string, number | null>
}

export type TeeRow = {
  id: string
  name: string
  gender: string
  courseRating: number | null
  slopeRating: number | null
}

export type Issue = { level: 'error' | 'warning'; message: string }

/** A hole outside these bounds is usually a typo or a metres/yards mix-up. */
const PAR_BOUNDS: Record<number, [number, number]> = {
  3: [100, 260],
  4: [230, 500],
  5: [420, 660],
  6: [550, 720],
}

const MIN_TOTAL_YARDS = 4500
const MAX_TOTAL_YARDS = 7800

export function validateScorecard(holes: HoleRow[], tees: TeeRow[]): Issue[] {
  const issues: Issue[] = []
  const n = holes.length

  if (n === 0) {
    return [{ level: 'error', message: 'No holes defined.' }]
  }

  // ── Par ───────────────────────────────────────────────────
  const pars = holes.map(h => h.par)
  if (pars.some(p => p === null)) {
    issues.push({ level: 'error', message: 'Every hole needs a par.' })
  } else if (pars.some(p => p! < 3 || p! > 6)) {
    issues.push({ level: 'error', message: 'Par must be between 3 and 6 on every hole.' })
  }

  // ── Stroke index ──────────────────────────────────────────
  const sis = holes.map(h => h.si)
  if (sis.some(s => s === null)) {
    issues.push({ level: 'error', message: 'Every hole needs a stroke index.' })
  } else {
    const sorted = [...(sis as number[])].sort((a, b) => a - b)
    const expected = Array.from({ length: n }, (_, i) => i + 1)
    if (!sorted.every((v, i) => v === expected[i])) {
      issues.push({
        level: 'error',
        message: `Stroke indices must use each number from 1 to ${n} exactly once (no repeats, no gaps).`,
      })
    } else if ((sis as number[]).every((s, i) => s === i + 1)) {
      // The exact bug this whole exercise exists to fix.
      issues.push({
        level: 'error',
        message:
          'Stroke index matches the hole number on every hole. That is placeholder data, not a real allocation — enter the stroke indices from the official card.',
      })
    } else if (n === 18) {
      const frontOdd = (sis as number[]).slice(0, 9).filter(s => s % 2 === 1).length
      if (frontOdd !== 0 && frontOdd !== 9) {
        issues.push({
          level: 'warning',
          message: `Stroke indices are usually split odd on one nine and even on the other; this card has ${frontOdd} odd on the front nine. Double-check against the official card.`,
        })
      }
    }
  }

  // ── Tees and yardages ─────────────────────────────────────
  if (tees.length === 0) {
    issues.push({ level: 'error', message: 'Add at least one set of tees.' })
  }

  for (const tee of tees) {
    const yards = holes.map(h => h.yardages[tee.id] ?? null)

    if (yards.some(y => y === null)) {
      issues.push({ level: 'error', message: `${tee.name}: every hole needs a yardage.` })
      continue
    }

    const values = yards as number[]
    if (values.some(y => y <= 0)) {
      issues.push({ level: 'error', message: `${tee.name}: yardages must be greater than zero.` })
      continue
    }

    const total = values.reduce((a, b) => a + b, 0)
    if (total < MIN_TOTAL_YARDS || total > MAX_TOTAL_YARDS) {
      issues.push({
        level: 'error',
        message: `${tee.name}: totals ${total} yds, outside the plausible ${MIN_TOTAL_YARDS}–${MAX_TOTAL_YARDS} range. Check for a typo or a metres/yards mix-up.`,
      })
    }

    holes.forEach((h, i) => {
      const par = h.par
      const y = values[i]
      if (par && PAR_BOUNDS[par]) {
        const [lo, hi] = PAR_BOUNDS[par]
        if (y < lo || y > hi) {
          issues.push({
            level: 'warning',
            message: `${tee.name} hole ${h.holeNumber}: par ${par} at ${y} yds is outside the typical ${lo}–${hi}. Verify (possible metres/yards mix-up).`,
          })
        }
      }
    })
  }

  return issues
}

export const hasBlockingErrors = (issues: Issue[]) => issues.some(i => i.level === 'error')

export const parTotal = (holes: HoleRow[]) =>
  holes.reduce((sum, h) => sum + (h.par ?? 0), 0)

export const teeTotal = (holes: HoleRow[], teeId: string) =>
  holes.reduce((sum, h) => sum + (h.yardages[teeId] ?? 0), 0)

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
  /** 18-hole stroke index per tee id. Differs between tees on cards where a
   *  nine-hole course is played twice ("Course 1" / "Course 2"). */
  si: Record<string, number | null>
  /** Optional nine-hole stroke index (1-9 within each nine) per tee id, used
   *  when only the front or back nine is played. */
  si9: Record<string, number | null>
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

// For 18 holes; scaled for a nine-row card.
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

  // ── Stroke index (per tee) ────────────────────────────────
  for (const tee of tees) issues.push(...checkStrokeIndex(holes, tee))

  // ── Tees and yardages ─────────────────────────────────────
  if (tees.length === 0) {
    issues.push({ level: 'error', message: 'Add at least one set of tees.' })
  }

  for (const tee of tees) {
    // WHS course handicap = Handicap Index × (Slope / 113) + (Rating − Par).
    // Without both numbers a verified card can't drive handicap maths, and
    // the app would have to invent them.
    if (tee.courseRating == null || tee.slopeRating == null) {
      issues.push({
        level: 'error',
        message: `${tee.name}: enter the course rating and slope from your KGU rating certificate — handicaps can't be calculated without them.`,
      })
    } else {
      if (tee.slopeRating < 55 || tee.slopeRating > 155) {
        issues.push({ level: 'error', message: `${tee.name}: slope ${tee.slopeRating} is outside the WHS range of 55–155.` })
      }
      if (tee.courseRating < 55 || tee.courseRating > 80) {
        issues.push({ level: 'warning', message: `${tee.name}: course rating ${tee.courseRating} looks unusual. Check the rating certificate.` })
      }
    }

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
    const minTotal = Math.round((MIN_TOTAL_YARDS * n) / 18)
    const maxTotal = Math.round((MAX_TOTAL_YARDS * n) / 18)
    if (total < minTotal || total > maxTotal) {
      issues.push({
        level: 'error',
        message: `${tee.name}: totals ${total} yds, outside the plausible ${minTotal}–${maxTotal} range. Check for a typo or a metres/yards mix-up.`,
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

function isPermutation(values: number[], n: number) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.length === n && sorted.every((v, i) => v === i + 1)
}

function checkStrokeIndex(holes: HoleRow[], tee: TeeRow): Issue[] {
  const issues: Issue[] = []
  const n = holes.length
  const sis = holes.map(h => h.si[tee.id] ?? null)

  if (sis.some(s => s === null)) {
    issues.push({ level: 'error', message: `${tee.name}: every hole needs a stroke index.` })
  } else if (!isPermutation(sis as number[], n)) {
    issues.push({
      level: 'error',
      message: `${tee.name}: stroke indexes must use each number from 1 to ${n} exactly once (no repeats, no gaps).`,
    })
  } else if ((sis as number[]).every((s, i) => s === i + 1)) {
    // The exact bug this whole exercise exists to fix.
    issues.push({
      level: 'error',
      message: `${tee.name}: stroke index matches the hole number on every hole. That is placeholder data — enter the stroke indexes from the official card.`,
    })
  } else if (n === 18) {
    const frontOdd = (sis as number[]).slice(0, 9).filter(s => s % 2 === 1).length
    if (frontOdd !== 0 && frontOdd !== 9) {
      issues.push({
        level: 'warning',
        message: `${tee.name}: stroke indexes are usually odd on one nine and even on the other; this card has ${frontOdd} odd on the front nine. Double-check against the official card.`,
      })
    }
  }

  // Nine-hole index is optional, but if any is entered each nine must be a
  // complete 1-9 allocation, or front/back-nine rounds get wrong strokes.
  const nines = holes.map(h => h.si9[tee.id] ?? null)
  if (nines.some(v => v !== null)) {
    for (let start = 0; start < n; start += 9) {
      const half = nines.slice(start, start + 9)
      const label = `holes ${start + 1}–${Math.min(start + 9, n)}`
      if (half.some(v => v === null)) {
        issues.push({ level: 'error', message: `${tee.name}: nine-hole stroke index is missing on some of ${label}. Fill all nine or leave all blank.` })
      } else if (!isPermutation(half as number[], half.length)) {
        issues.push({ level: 'error', message: `${tee.name}: nine-hole stroke indexes on ${label} must use 1 to ${half.length} exactly once.` })
      }
    }
  }

  return issues
}

export const hasBlockingErrors = (issues: Issue[]) => issues.some(i => i.level === 'error')

export const parTotal = (holes: HoleRow[]) =>
  holes.reduce((sum, h) => sum + (h.par ?? 0), 0)

export const teeTotal = (holes: HoleRow[], teeId: string) =>
  holes.reduce((sum, h) => sum + (h.yardages[teeId] ?? 0), 0)

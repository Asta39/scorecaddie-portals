'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Plus, Trash2, Save, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import {
  validateScorecard,
  hasBlockingErrors,
  parTotal,
  teeTotal,
  type HoleRow,
  type TeeRow,
  type Issue,
} from '@/lib/scorecard-validation'

const GENDERS = ['men', 'women', 'unisex']

export default function ScorecardPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [clubName, setClubName] = useState('')
  const [holeCount, setHoleCount] = useState(18)
  const [dataVerified, setDataVerified] = useState(false)
  const [dataSource, setDataSource] = useState<string | null>(null)

  const [tees, setTees] = useState<TeeRow[]>([])
  const [holes, setHoles] = useState<HoleRow[]>([])

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: admin } = await supabase
        .from('club_admins')
        .select('club_id, clubs(name, course_id)')
        .eq('user_id', user.id)
        .single()

      const club = Array.isArray(admin?.clubs) ? admin.clubs[0] : admin?.clubs
      const cid = club?.course_id ?? null
      setClubName(club?.name ?? '')
      setCourseId(cid)
      if (!cid) return

      const { data: course } = await supabase
        .from('Course')
        .select('"holesCount", "dataVerified", "dataSource"')
        .eq('id', cid)
        .maybeSingle()

      const count = course?.holesCount ?? 18
      setHoleCount(count)
      setDataVerified(course?.dataVerified ?? false)
      setDataSource(course?.dataSource ?? null)

      const { data: teeRows } = await supabase
        .from('Tee')
        .select('id, name, gender, "courseRating", "slopeRating"')
        .eq('courseId', cid)
        .order('name')

      const loadedTees: TeeRow[] = (teeRows ?? []).map(t => ({
        id: t.id,
        name: t.name,
        gender: t.gender ?? 'men',
        courseRating: t.courseRating,
        slopeRating: t.slopeRating,
      }))
      setTees(loadedTees)

      const { data: holeRows } = await supabase
        .from('CourseHole')
        .select('"teeId", "holeNumber", par, "handicapIndex", distance')
        .eq('courseId', cid)

      // par/SI are properties of the hole, not the tee, so take the first
      // non-null value seen for each hole; yardage stays per tee.
      const built: HoleRow[] = Array.from({ length: count }, (_, i) => ({
        holeNumber: i + 1,
        par: null,
        si: null,
        yardages: {},
      }))

      for (const r of holeRows ?? []) {
        const idx = (r.holeNumber as number) - 1
        if (idx < 0 || idx >= count) continue
        const row = built[idx]
        if (row.par == null && r.par != null) row.par = r.par
        if (row.si == null && r.handicapIndex != null) row.si = r.handicapIndex
        if (r.teeId) row.yardages[r.teeId] = r.distance ?? null
      }

      setHoles(built)
    } finally {
      setLoading(false)
    }
  }

  const issues: Issue[] = holes.length ? validateScorecard(holes, tees) : []
  const blocked = hasBlockingErrors(issues)

  const setHole = useCallback((idx: number, patch: Partial<HoleRow>) => {
    setHoles(prev => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)))
  }, [])

  const setYardage = useCallback((idx: number, teeId: string, value: number | null) => {
    setHoles(prev => prev.map((h, i) =>
      i === idx ? { ...h, yardages: { ...h.yardages, [teeId]: value } } : h
    ))
  }, [])

  const addTee = () => {
    const name = prompt('Tee name (e.g. Blue, White, Yellow, Red)')?.trim()
    if (!name) return
    const id = `${courseId}-${name.toLowerCase().replace(/\s+/g, '-')}`
    if (tees.some(t => t.id === id)) { alert('That tee already exists.'); return }
    setTees(prev => [...prev, { id, name, gender: 'men', courseRating: null, slopeRating: null }])
  }

  const removeTee = (id: string) => {
    if (!confirm('Remove this tee and its yardages?')) return
    setTees(prev => prev.filter(t => t.id !== id))
    setHoles(prev => prev.map(h => {
      const { [id]: _drop, ...rest } = h.yardages
      return { ...h, yardages: rest }
    }))
  }

  const save = async () => {
    if (!courseId || blocked) return
    setSaving(true)
    try {
      // Upsert tees.
      const { error: teeErr } = await supabase.from('Tee').upsert(
        tees.map(t => ({
          id: t.id,
          courseId,
          name: t.name,
          gender: t.gender,
          courseRating: t.courseRating,
          slopeRating: t.slopeRating,
          par: parTotal(holes),
          yardage: teeTotal(holes, t.id),
        })),
        { onConflict: 'id' }
      )
      if (teeErr) throw teeErr

      // Replace this course's holes wholesale — simpler and safer than
      // diffing, and the unique index would reject any stale duplicate.
      const { error: delErr } = await supabase.from('CourseHole').delete().eq('courseId', courseId)
      if (delErr) throw delErr

      const holeRows = tees.flatMap(t =>
        holes.map(h => ({
          id: `${t.id}-h${h.holeNumber}`,
          courseId,
          teeId: t.id,
          holeNumber: h.holeNumber,
          par: h.par,
          handicapIndex: h.si,
          distance: h.yardages[t.id] ?? null,
        }))
      )

      const { error: holeErr } = await supabase.from('CourseHole').insert(holeRows)
      if (holeErr) throw holeErr

      const { data: { user } } = await supabase.auth.getUser()
      const { error: courseErr } = await supabase
        .from('Course')
        .update({
          par18: parTotal(holes),
          dataVerified: true,
          dataSource: 'official-card',
          verifiedAt: new Date().toISOString(),
          verifiedBy: user?.id ?? null,
        })
        .eq('id', courseId)
      if (courseErr) throw courseErr

      setDataVerified(true)
      setDataSource('official-card')
      alert('Scorecard saved and marked verified.')
    } catch (err: any) {
      console.error(err)
      alert(`Failed to save scorecard: ${err.message ?? err}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-text-muted">Loading…</div>

  if (!courseId) {
    return (
      <div className="p-8">
        <div className="card p-8 text-center text-text-muted">
          This club isn&apos;t linked to a course yet, so there&apos;s no scorecard to edit.
          Ask the platform admin to link a course to {clubName || 'this club'}.
        </div>
      </div>
    )
  }

  const errors = issues.filter(i => i.level === 'error')
  const warnings = issues.filter(i => i.level === 'warning')

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Scorecard</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Enter your official card — par, stroke index and yardages. This drives handicap
          calculations in the player app, so it must match the printed card exactly.
        </p>
      </div>

      {!dataVerified && (
        <div className="card p-4 mb-6 flex items-start gap-3 border-l-4 border-amber-400">
          <Info size={18} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="text-sm">
            <span className="font-medium">This course is showing estimated data.</span>{' '}
            The scorecard currently in the app was generated, not sourced from your card —
            stroke indices in particular were placeholders. Entering your official card here
            replaces it and marks the course verified.
            {dataSource && <span className="text-text-muted"> (current source: {dataSource})</span>}
          </div>
        </div>
      )}

      {dataVerified && (
        <div className="card p-4 mb-6 flex items-center gap-3 border-l-4 border-green-500">
          <CheckCircle2 size={18} className="text-green-600 shrink-0" />
          <div className="text-sm">
            <span className="font-medium">Verified.</span>{' '}
            <span className="text-text-muted">This scorecard is being used for official handicap calculations.</span>
          </div>
        </div>
      )}

      {/* Tees */}
      <div className="card p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-medium">Tees</h3>
            <p className="text-sm text-text-muted">Course and slope ratings come from your KGU rating certificate.</p>
          </div>
          <button onClick={addTee} className="flex items-center gap-1.5 bg-primary text-white rounded-xl px-4 py-2 text-sm font-medium">
            <Plus size={16} /> Add Tee
          </button>
        </div>

        {tees.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">No tees yet — add one to start.</div>
        ) : (
          <div className="space-y-2">
            {tees.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-light flex-wrap">
                <span className="font-medium w-24">{t.name}</span>
                <select
                  value={t.gender}
                  onChange={e => setTees(prev => prev.map((x, j) => j === i ? { ...x, gender: e.target.value } : x))}
                  className="bg-background border rounded-lg px-3 py-1.5 text-sm capitalize"
                >
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <label className="text-sm text-text-muted">Course rating</label>
                <input
                  type="number" step="0.1" value={t.courseRating ?? ''}
                  onChange={e => setTees(prev => prev.map((x, j) => j === i ? { ...x, courseRating: e.target.value === '' ? null : parseFloat(e.target.value) } : x))}
                  className="w-20 bg-background border rounded-lg px-3 py-1.5 text-sm"
                />
                <label className="text-sm text-text-muted">Slope</label>
                <input
                  type="number" value={t.slopeRating ?? ''}
                  onChange={e => setTees(prev => prev.map((x, j) => j === i ? { ...x, slopeRating: e.target.value === '' ? null : parseFloat(e.target.value) } : x))}
                  className="w-20 bg-background border rounded-lg px-3 py-1.5 text-sm"
                />
                <span className="text-sm text-text-muted ml-auto">{teeTotal(holes, t.id)} yds</span>
                <button onClick={() => removeTee(t.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hole grid */}
      <div className="card p-6 mb-6">
        <h3 className="font-medium mb-4">Holes</h3>
        <div className="table-responsive-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Hole</th>
                <th>Par</th>
                <th>Stroke Index</th>
                {tees.map(t => <th key={t.id}>{t.name} (yds)</th>)}
              </tr>
            </thead>
            <tbody>
              {holes.map((h, i) => (
                <tr key={h.holeNumber}>
                  <td className="font-mono font-medium">{h.holeNumber}</td>
                  <td>
                    <input
                      type="number" min={3} max={6} value={h.par ?? ''}
                      onChange={e => setHole(i, { par: e.target.value === '' ? null : parseInt(e.target.value) })}
                      className="w-16 bg-background border rounded-lg px-2 py-1 text-sm"
                    />
                  </td>
                  <td>
                    <input
                      type="number" min={1} max={holeCount} value={h.si ?? ''}
                      onChange={e => setHole(i, { si: e.target.value === '' ? null : parseInt(e.target.value) })}
                      className="w-16 bg-background border rounded-lg px-2 py-1 text-sm"
                    />
                  </td>
                  {tees.map(t => (
                    <td key={t.id}>
                      <input
                        type="number" value={h.yardages[t.id] ?? ''}
                        onChange={e => setYardage(i, t.id, e.target.value === '' ? null : parseInt(e.target.value))}
                        className="w-20 bg-background border rounded-lg px-2 py-1 text-sm"
                      />
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="font-medium bg-gray-50">
                <td>Total</td>
                <td>{parTotal(holes)}</td>
                <td />
                {tees.map(t => <td key={t.id}>{teeTotal(holes, t.id)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Validation */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="card p-6 mb-6">
          <h3 className="font-medium mb-3">Checks</h3>
          <div className="space-y-2">
            {errors.map((issue, i) => (
              <div key={`e${i}`} className="flex items-start gap-2 text-sm text-red-700">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{issue.message}</span>
              </div>
            ))}
            {warnings.map((issue, i) => (
              <div key={`w${i}`} className="flex items-start gap-2 text-sm text-amber-700">
                <Info size={16} className="mt-0.5 shrink-0" />
                <span>{issue.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={blocked || saving || tees.length === 0}
          className={`flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-medium ${
            blocked || saving || tees.length === 0
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-primary text-white'
          }`}
        >
          <Save size={16} /> {saving ? 'Saving…' : 'Save & mark verified'}
        </button>
        {blocked && (
          <span className="text-sm text-text-muted">
            Fix the errors above before saving — this data drives handicap calculations.
          </span>
        )}
      </div>
    </div>
  )
}

'use client'

import { MASCOTS } from '@scorecaddie/shared/mascots'
import { Mascot } from '@/components/mascot'

/**
 * Pick the club's mascot. Mascots other clubs hold are left out, so each
 * club's mascot is its own; the database enforces the same rule.
 */
export default function MascotPicker({
  value,
  onChange,
  taken,
}: {
  value: string
  onChange: (key: string) => void
  /** Mascots held by other clubs. */
  taken: string[]
}) {
  const available = MASCOTS.filter(m => !taken.includes(m.key))

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium" style={{ color: 'var(--color-text)' }}>Club Mascot</label>
        <span className="text-xs text-muted-foreground">{available.length} of {MASCOTS.length} left</span>
      </div>
      <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
        Shown across the club&apos;s portal, leaderboards and emails. No two clubs share one.
      </p>

      {available.length === 0 ? (
        <p className="text-sm text-muted-foreground">Every mascot is taken. The club can be created without one.</p>
      ) : (
        <div className="flex gap-3 items-start">
          <div
            role="radiogroup"
            aria-label="Club mascot"
            className="grid flex-1 gap-1.5 overflow-y-auto pr-1"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))', maxHeight: 176 }}
          >
            {available.map(m => (
              <button
                key={m.key}
                type="button"
                role="radio"
                aria-checked={value === m.key}
                title={m.label}
                onClick={() => onChange(m.key)}
                className={`flex flex-col items-center rounded-lg border p-1 text-[11px] transition-colors ${
                  value === m.key ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                <Mascot mascot={m.key} size={40} />
                {m.label}
              </button>
            ))}
          </div>
          {value && (
            <div className="hidden sm:flex w-24 flex-col items-center gap-1 text-center">
              <Mascot mascot={value} mood="work" size={72} hop />
              <span className="text-xs font-semibold">{MASCOTS.find(m => m.key === value)?.label}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

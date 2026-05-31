import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

const severityConfig = {
  critical: { icon: AlertTriangle, color: '#ef4444', bg: '#fee2e2', label: 'Critical' },
  warning: { icon: AlertCircle, color: '#f59e0b', bg: '#fef3c7', label: 'Warning' },
  info: { icon: Info, color: 'var(--color-secondary)', bg: 'var(--color-lighter)', label: 'Info' },
}

export default function RecentFlagsCard({ flags }: { flags: any[] }) {
  return (
    <div className="card h-full">
      <div className="card-header">
        <div>
          <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>Flags & Alerts</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-light)' }}>Unresolved issues</p>
        </div>
        <Link href="/flags" className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>View all →</Link>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--color-lighter)' }}>
        {flags.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--color-lighter)' }}>
              <Info size={18} style={{ color: 'var(--color-secondary)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>All clear!</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-light)' }}>No unresolved flags</p>
          </div>
        ) : flags.map((flag: any) => {
          const cfg = severityConfig[flag.severity as keyof typeof severityConfig] ?? severityConfig.info
          const Icon = cfg.icon
          return (
            <div key={flag.id} className="px-5 py-3.5 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: cfg.bg }}>
                <Icon size={14} style={{ color: cfg.color }} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{flag.message}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-light)' }}>
                  {flag.clubs?.name ?? 'Platform'} · {formatDistanceToNow(new Date(flag.created_at), { addSuffix: true })}
                </p>
              </div>
              <span className="badge text-xs flex-shrink-0"
                style={{ background: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

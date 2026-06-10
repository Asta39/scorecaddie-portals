import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import ResolveFlag from '@/components/flags/ResolveFlag'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'

export const dynamic = 'force-dynamic'

const severityConfig = {
  critical: { Icon: AlertTriangle, color: '#ef4444', bg: '#fee2e2', label: 'Critical' },
  warning: { Icon: AlertCircle, color: '#f59e0b', bg: '#fef3c7', label: 'Warning' },
  info: { Icon: Info, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'Info' },
}

export default async function FlagsPage() {
  const supabase = await createClient()

  const { data: flags } = await supabase
    .from('platform_flags')
    .select('*, clubs(name), caddies(name)')
    .order('resolved', { ascending: true }) // unresolved first
    .order('created_at', { ascending: false })

  const unresolvedCount = flags?.filter((f: any) => !f.resolved).length ?? 0

  return (
    <div className="portal-content">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Flags & Alerts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unresolvedCount} unresolved · {flags?.length ?? 0} total
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {(!flags || flags.length === 0) ? (
          <div className="card p-12 text-center">
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center bg-muted">
              <Info size={24} className="text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">All clear — no flags</p>
            <p className="text-sm text-muted-foreground mt-1">The platform is running smoothly</p>
          </div>
        ) : flags.map((flag: any) => {
          const cfg = severityConfig[flag.severity as keyof typeof severityConfig] ?? severityConfig.info
          const { Icon } = cfg
          return (
            <div key={flag.id} className="card"
              style={{ opacity: flag.resolved ? 0.6 : 1 }}>
              <div className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: cfg.bg }}>
                  <Icon size={18} style={{ color: cfg.color }} strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge text-xs" style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {flag.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{flag.message}</p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {flag.clubs?.name ?? 'Platform'} ·{' '}
                        {flag.caddies?.name ? `${flag.caddies.name} · ` : ''}
                        {format(new Date(flag.created_at), 'd MMM yyyy, HH:mm')}
                      </p>
                      {flag.resolved && flag.resolved_note && (
                        <p className="text-xs mt-2 p-2 rounded bg-muted text-muted-foreground">
                          ✓ Resolved: {flag.resolved_note}
                        </p>
                      )}
                    </div>
                    {!flag.resolved && <ResolveFlag flagId={flag.id} />}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

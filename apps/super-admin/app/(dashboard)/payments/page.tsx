import { createClient } from '@/lib/supabase'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { TrendingUp, Wallet, AlertCircle } from 'lucide-react'
import { PlatformRevenueChart } from '@/components/dashboard/SuperAdminCharts'

export const dynamic = 'force-dynamic'

export default async function PaymentsPage() {
  const supabase = await createClient()

  const { data: payments } = await supabase
    .from('caddie_payments')
    .select('*, clubs(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  const allPayments = payments ?? []

  const totalConfirmed = allPayments.filter((p: any) => p.status === 'confirmed')
    .reduce((sum: number, p: any) => sum + p.amount_kes, 0)

  const thisMonth = allPayments.filter((p: any) => {
    const d = new Date(p.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const monthTotal = thisMonth.filter((p: any) => p.status === 'confirmed')
    .reduce((sum: number, p: any) => sum + p.amount_kes, 0)

  // Calculate monthly revenue for chart
  const now = new Date()
  const monthlyRevenue: { month: string; amount: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const m = subMonths(now, i)
    const label = format(m, 'MMM')
    const mStart = startOfMonth(m).toISOString()
    const mEnd = endOfMonth(m).toISOString()
    const total = allPayments
      .filter(p => p.status === 'confirmed' && p.created_at >= mStart && p.created_at <= mEnd)
      .reduce((sum, p) => sum + (p.amount_kes ?? 0), 0)
    monthlyRevenue.push({ month: label, amount: total })
  }

  return (
    <div className="portal-content">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Payments</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>All Paystack transactions across clubs</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Highlighted Card */}
        <div className="card" style={{
          padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #0B2B26 0%, #163832 100%)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
                This Month
              </p>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                KES {monthTotal.toLocaleString()}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.5rem' }}>
                {thisMonth.length} transactions
              </p>
            </div>
            <div style={{
              width: 38, height: 38, borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.1)', flexShrink: 0,
            }}>
              <TrendingUp size={18} color="#8EB69B" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Normal Cards */}
        {[
          { label: 'All Time Revenue', value: `KES ${totalConfirmed.toLocaleString()}`, sub: 'Confirmed payments only', icon: Wallet, color: '#235347', bg: '#DAF1DE' },
          { label: 'Pending / Failed', value: payments?.filter((p: any) => p.status !== 'confirmed').length ?? 0, sub: 'Needs investigation', icon: AlertCircle, color: '#991b1b', bg: '#fef2f2' },
        ].map(card => (
          <div key={card.label} className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8EB69B', marginBottom: '0.5rem' }}>
                  {card.label}
                </p>
                <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.1 }}>
                  {card.value}
                </p>
                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                  {card.sub}
                </p>
              </div>
              <div style={{
                width: 38, height: 38, borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: card.bg, flexShrink: 0,
              }}>
                <card.icon size={18} color={card.color} strokeWidth={2} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card mb-8" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 className="font-semibold" style={{ fontSize: '1rem', color: 'var(--color-text)' }}>Revenue Overview</h3>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>Platform-wide payment volume (last 6 months)</p>
          </div>
          <div style={{
            fontSize: '0.7rem', fontWeight: 700, color: '#10b981',
            background: '#ecfdf5', padding: '4px 10px', borderRadius: '6px',
          }}>
            KES {totalConfirmed.toLocaleString()} total
          </div>
        </div>
        <PlatformRevenueChart data={monthlyRevenue} />
      </div>

      <div className="card">
        <div className="table-responsive-wrapper">
          <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Club</th>
              <th>Reference</th>
              <th>Caddies</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(!payments || payments.length === 0) ? (
              <tr>
                <td colSpan={6} className="text-center py-12" style={{ color: 'var(--color-light)' }}>
                  No payment records yet
                </td>
              </tr>
            ) : payments.map((p: any) => (
              <tr key={p.id}>
                <td className="text-sm">{format(new Date(p.created_at), 'd MMM yyyy')}</td>
                <td className="font-medium text-sm">{(p as any).clubs?.name ?? '—'}</td>
                <td className="font-mono text-xs" style={{ color: 'var(--color-secondary)' }}>{p.paystack_reference}</td>
                <td className="text-sm">{p.caddie_count}</td>
                <td className="font-semibold text-sm">KES {p.amount_kes.toLocaleString()}</td>
                <td>
                  <span className={`badge badge-${p.status === 'confirmed' ? 'active' : p.status === 'failed' ? 'suspended' : 'warning'}`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

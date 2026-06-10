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
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All Paystack transactions across clubs</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Highlighted Card */}
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                This Month
              </p>
              <p className="text-3xl font-extrabold text-foreground leading-none">
                KES {monthTotal.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {thisMonth.length} transactions
              </p>
            </div>
            <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-950/30">
              <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Normal Cards */}
        {[
          { label: 'All Time Revenue', value: `KES ${totalConfirmed.toLocaleString()}`, sub: 'Confirmed payments only', icon: Wallet, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Pending / Failed', value: String(payments?.filter((p: any) => p.status !== 'confirmed').length ?? 0), sub: 'Needs investigation', icon: AlertCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
        ].map(card => (
          <div key={card.label} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                  {card.label}
                </p>
                <p className="text-3xl font-extrabold text-foreground leading-none">
                  {card.value}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {card.sub}
                </p>
              </div>
              <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0" style={{ background: card.bg }}>
                <card.icon size={18} color={card.color} strokeWidth={2} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card mb-8 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Revenue Overview</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Platform-wide payment volume (last 6 months)</p>
          </div>
          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-md">
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
                <td colSpan={6} className="text-center py-12 text-muted-foreground">
                  No payment records yet
                </td>
              </tr>
            ) : payments.map((p: any) => (
              <tr key={p.id}>
                <td className="text-sm">{format(new Date(p.created_at), 'd MMM yyyy')}</td>
                <td className="font-medium text-sm">{(p as any).clubs?.name ?? '—'}</td>
                <td className="font-mono text-xs text-muted-foreground">{p.paystack_reference}</td>
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

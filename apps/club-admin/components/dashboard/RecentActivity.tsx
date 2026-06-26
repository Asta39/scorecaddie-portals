import { format } from 'date-fns'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

type Payment = {
  id: string
  paystack_reference: string
  amount_kes: number
  caddie_count: number
  status: string
  paid_at: string
}

export function RecentActivity({ payments }: { payments: Payment[] }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.25rem 1.5rem 1rem',
      }}>
        <div>
          <h3 className="font-semibold" style={{ color: 'var(--color-text)', fontSize: '1rem' }}>
            Recent Activity
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
            Latest subscription payments
          </p>
        </div>
        <Link href="/payments"
          style={{
            fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', gap: '3px',
          }}>
          View All <ArrowUpRight size={13} />
        </Link>
      </div>

      <table className="data-table" style={{ margin: 0 }}>
        <thead>
          <tr>
            <th>Reference</th>
            <th>Caddies</th>
            <th>Amount</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {payments.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  No payments recorded yet
                </p>
              </td>
            </tr>
          ) : (
            payments.map(p => (
              <tr key={p.id}>
                <td>
                  <span style={{
                    fontFamily: 'monospace', fontSize: '0.75rem',
                    background: 'var(--color-lighter)', padding: '2px 8px',
                    borderRadius: '4px', color: 'var(--color-text)',
                  }}>
                    {p.paystack_reference.substring(0, 14)}…
                  </span>
                </td>
                <td>
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    {p.caddie_count}
                  </span>
                </td>
                <td>
                  <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                    KES {p.amount_kes.toLocaleString()}
                  </span>
                </td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                  {format(new Date(p.paid_at), 'd MMM yyyy')}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

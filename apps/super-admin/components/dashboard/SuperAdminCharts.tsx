'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, Legend,
} from 'recharts'

// ─── Platform Revenue Area Chart ─────────────────────────────────────
type RevenuePoint = { month: string; amount: number }

export function PlatformRevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="saRevenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.15)" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false} tickLine={false}
          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
            fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            color: 'var(--card-foreground)'
          }}
          formatter={(value: any) => [`KES ${Number(value).toLocaleString()}`, 'Revenue']}
          labelStyle={{ fontWeight: 700, color: 'var(--foreground)' }}
        />
        <Area
          type="monotone" dataKey="amount"
          stroke="#10b981" strokeWidth={2.5}
          fill="url(#saRevenueGrad)"
          dot={{ r: 4, fill: '#fff', stroke: '#10b981', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Subscription Breakdown Donut ────────────────────────────────────
type SubSlice = { name: string; value: number }
const SUB_COLORS = ['#10b981', '#3b82f6', '#ef4444']

export function SubscriptionDonut({ data }: { data: SubSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data} cx="50%" cy="50%"
            innerRadius={58} outerRadius={82}
            paddingAngle={3} dataKey="value"
            startAngle={90} endAngle={-270} stroke="none"
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={SUB_COLORS[i % SUB_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 8, fontSize: 12, color: 'var(--card-foreground)'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none',
      }}>
        <span style={{ fontSize: '1.75rem', fontWeight: 800 }} className="text-foreground">{total}</span>
        <br />
        <span style={{ fontSize: '0.6rem', fontWeight: 500 }} className="text-muted-foreground">total caddies</span>
      </div>
    </div>
  )
}

// ─── Club Caddies Bar Chart ──────────────────────────────────────────
type ClubBar = { name: string; caddies: number; active: number }

export function ClubCaddiesChart({ data }: { data: ClubBar[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.15)" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false} tickLine={false}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false} tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 8, fontSize: 12, color: 'var(--card-foreground)'
          }}
        />
        <Legend
          iconSize={8} iconType="circle"
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
        <Bar dataKey="caddies" name="Total Caddies" fill="#6b7280" radius={[4, 4, 0, 0]} barSize={18} isAnimationActive={false} />
        <Bar dataKey="active" name="Active Subs" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

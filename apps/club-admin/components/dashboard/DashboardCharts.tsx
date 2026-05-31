'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts'

// ─── Revenue Area Chart ─────────────────────────────────────────────
type RevenuePoint = { month: string; amount: number }

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 className="font-semibold" style={{ color: 'var(--color-text)', fontSize: '1rem' }}>
          Revenue Overview
        </h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
          Monthly caddie subscription payments
        </p>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-lighter)" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `KSh ${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              background: '#fff',
              border: '1px solid var(--color-lighter)',
              borderRadius: '8px',
              fontSize: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
            formatter={(value: any) => [`KES ${Number(value).toLocaleString()}`, 'Revenue']}
            labelStyle={{ fontWeight: 600, color: 'var(--color-text)' }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="var(--color-primary)"
            strokeWidth={2.5}
            fill="url(#revenueGrad)"
            dot={{ r: 4, fill: '#fff', stroke: 'var(--color-primary)', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: 'var(--color-primary)', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Presence Donut ──────────────────────────────────────────────────
type PresenceData = { name: string; value: number }

const PRESENCE_COLORS = ['#10b981', '#e5e7eb']

export function PresenceDonut({ data }: { data: PresenceData[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const present = data.find(d => d.name === 'Present')?.value ?? 0

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div style={{ marginBottom: '0.5rem' }}>
        <h3 className="font-semibold" style={{ color: 'var(--color-text)', fontSize: '1rem' }}>
          Attendance
        </h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
          Present vs Absent today
        </p>
      </div>

      <div style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={78}
              paddingAngle={3}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={`cell-${i}`} fill={PRESENCE_COLORS[i % PRESENCE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid var(--color-lighter)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>
            {total > 0 ? Math.round((present / total) * 100) : 0}%
          </span>
          <br />
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            present
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', marginTop: '0.25rem' }}>
        {data.map((d, i) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: PRESENCE_COLORS[i] }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
              {d.name} ({d.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Experience Level Bar Chart ──────────────────────────────────────
type ExperiencePoint = { level: string; count: number }

const LEVEL_COLORS: Record<string, string> = {
  Beginner: '#60a5fa',
  Intermediate: '#f59e0b',
  Expert: '#10b981',
}

export function ExperienceChart({ data }: { data: ExperiencePoint[] }) {
  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 className="font-semibold" style={{ color: 'var(--color-text)', fontSize: '1rem' }}>
          Experience Mix
        </h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
          Caddie skill distribution
        </p>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={32}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-lighter)" />
          <XAxis
            dataKey="level"
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: '#fff',
              border: '1px solid var(--color-lighter)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Bar
            dataKey="count"
            radius={[6, 6, 0, 0]}
            // each bar gets its own color from the LEVEL_COLORS map
            fill="var(--color-primary)"
          >
            {data.map((entry) => (
              <Cell key={entry.level} fill={LEVEL_COLORS[entry.level] ?? 'var(--color-primary)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

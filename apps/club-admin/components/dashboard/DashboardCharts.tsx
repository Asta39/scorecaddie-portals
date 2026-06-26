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
      <div className="mb-4">
        <h3 className="font-semibold text-foreground text-base">
          Revenue Overview
        </h3>
        <p className="text-muted-foreground text-xs mt-0.5">
          Monthly caddie subscription payments
        </p>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="currentColor" className="text-primary" stopOpacity={0.25} />
              <stop offset="95%" stopColor="currentColor" className="text-primary" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `KSh ${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              borderColor: 'hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'hsl(var(--foreground))',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
            formatter={(value: any) => [`KES ${Number(value).toLocaleString()}`, 'Revenue']}
            labelStyle={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            className="stroke-primary fill-primary"
            strokeWidth={2.5}
            fillOpacity={0.2}
            dot={{ r: 4, className: "fill-card stroke-primary", strokeWidth: 2 }}
            activeDot={{ r: 6, className: "fill-primary stroke-card", strokeWidth: 2 }}
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
      <div className="mb-2">
        <h3 className="font-semibold text-foreground text-base">
          Attendance
        </h3>
        <p className="text-muted-foreground text-xs mt-0.5">
          Present vs Absent today
        </p>
      </div>

      <div className="relative">
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
                <Cell key={`cell-${i}`} fill={PRESENCE_COLORS[i % PRESENCE_COLORS.length]} className={i === 1 ? 'fill-muted' : ''} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'hsl(var(--foreground))',
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <span className="text-3xl font-extrabold text-foreground">
            {total > 0 ? Math.round((present / total) * 100) : 0}%
          </span>
          <br />
          <span className="text-[10px] font-medium text-muted-foreground">
            present
          </span>
        </div>
      </div>

      <div className="flex justify-center gap-5 mt-1">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <div className={`size-2.5 rounded-full ${i === 1 ? 'bg-muted' : ''}`} style={i !== 1 ? { background: PRESENCE_COLORS[i] } : {}} />
            <span className="text-xs text-muted-foreground">
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
      <div className="mb-4">
        <h3 className="font-semibold text-foreground text-base">
          Experience Mix
        </h3>
        <p className="text-muted-foreground text-xs mt-0.5">
          Caddie skill distribution
        </p>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={32}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis
            dataKey="level"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--card)',
              borderColor: 'var(--border)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--foreground)',
            }}
            cursor={{ fill: 'var(--muted)' }}
            itemStyle={{ color: 'var(--foreground)' }}
          />
          <Bar
            dataKey="count"
            radius={[6, 6, 0, 0]}
            // each bar gets its own color from the LEVEL_COLORS map
            className="fill-primary"
          >
            {data.map((entry) => (
              <Cell key={entry.level} fill={LEVEL_COLORS[entry.level]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyProfit } from '../types'
import { formatDisplayDate, formatGold, formatWeekday } from '../lib/finance'
import { buildProfitWeeks, defaultWeekId } from '../lib/weeks'

type Props = {
  data: DailyProfit[]
}

export function ProfitChart({ data }: Props) {
  const weeks = useMemo(() => buildProfitWeeks(data), [data])
  const [weekId, setWeekId] = useState(() => defaultWeekId(weeks))

  useEffect(() => {
    if (!weeks.some((w) => w.id === weekId)) {
      setWeekId(defaultWeekId(weeks))
    }
  }, [weeks, weekId])

  const selected = weeks.find((w) => w.id === weekId) ?? weeks[0]
  const chartData =
    selected?.days.map((d) => ({
      ...d,
      label: formatWeekday(d.date),
      fullLabel: formatDisplayDate(d.date),
    })) ?? []

  const hasAnySales = data.some((d) => d.entryCount > 0)

  return (
    <section className="panel chart-panel">
      <header className="panel-header form-header-row">
        <div>
          <h2>Daily profit</h2>
        </div>
        {weeks.length > 0 && (
          <label className="week-select">
            <span className="sr-only">Week</span>
            <select
              value={selected?.id ?? ''}
              onChange={(e) => setWeekId(e.target.value)}
              aria-label="Select profit week"
            >
              {weeks.map((week) => (
                <option key={week.id} value={week.id}>
                  {week.label}
                  {week.weekNet > 0 ? ` · ${formatGold(week.weekNet)}` : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {!hasAnySales ? (
        <div className="chart-empty">
          <p>Add sales to see your daily profit curve.</p>
        </div>
      ) : (
        <div className="chart-wrap">
          <div className="chart-fill">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2f6b4f" stopOpacity={0.45} />
                    <stop
                      offset="100%"
                      stopColor="#2f6b4f"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="rgba(30, 45, 38, 0.08)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#3d5248', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  padding={{ left: 4, right: 4 }}
                />
                <YAxis
                  tick={{ fill: '#3d5248', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: '#f4f7f1',
                    border: '1px solid rgba(47, 107, 79, 0.25)',
                    borderRadius: 8,
                    color: '#1e2d26',
                  }}
                  formatter={(value) => [
                    `${formatGold(Number(value ?? 0))} gold`,
                    'Net',
                  ]}
                  labelFormatter={(_label, payload) => {
                    const full = payload?.[0]?.payload?.fullLabel
                    return full ? String(full) : String(_label)
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="net"
                  stroke="#245c42"
                  strokeWidth={2.5}
                  fill="url(#netFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  )
}

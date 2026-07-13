import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyProfit } from '../types'
import {
  formatCompactGold,
  formatDisplayDate,
  formatGold,
  formatWeekday,
} from '../lib/finance'
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

  const yMax = Math.max(0, ...chartData.map((d) => d.net), 0)
  const yMin = Math.min(0, ...chartData.map((d) => d.net), 0)
  const ySpan = yMax - yMin || 1
  const zeroOffset = `${(yMax / ySpan) * 100}%`
  const hasNegatives = yMin < 0
  const hasPositives = yMax > 0
  const hasAnyActivity = data.some((d) => d.entryCount > 0 || d.net !== 0)

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
                  {week.weekNet !== 0 ? ` · ${formatGold(week.weekNet)}` : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {!hasAnyActivity ? (
        <div className="chart-empty">
          <p>Add sales to see your daily profit curve.</p>
        </div>
      ) : (
        <div className="chart-wrap">
          <div className="chart-fill">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                    {hasPositives && (
                      <>
                        <stop
                          offset="0%"
                          stopColor="#2f6b4f"
                          stopOpacity={0.45}
                        />
                        <stop
                          offset={zeroOffset}
                          stopColor="#2f6b4f"
                          stopOpacity={0.08}
                        />
                      </>
                    )}
                    {hasNegatives && (
                      <>
                        <stop
                          offset={zeroOffset}
                          stopColor="#9b3b32"
                          stopOpacity={0.08}
                        />
                        <stop
                          offset="100%"
                          stopColor="#9b3b32"
                          stopOpacity={0.42}
                        />
                      </>
                    )}
                    {!hasPositives && !hasNegatives && (
                      <>
                        <stop
                          offset="0%"
                          stopColor="#2f6b4f"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="100%"
                          stopColor="#2f6b4f"
                          stopOpacity={0.02}
                        />
                      </>
                    )}
                  </linearGradient>
                  <linearGradient id="netStroke" x1="0" y1="0" x2="0" y2="1">
                    {hasPositives && (
                      <>
                        <stop offset="0%" stopColor="#245c42" />
                        <stop offset={zeroOffset} stopColor="#245c42" />
                      </>
                    )}
                    {hasNegatives && (
                      <>
                        <stop offset={zeroOffset} stopColor="#9b3b32" />
                        <stop offset="100%" stopColor="#9b3b32" />
                      </>
                    )}
                    {!hasPositives && !hasNegatives && (
                      <>
                        <stop offset="0%" stopColor="#245c42" />
                        <stop offset="100%" stopColor="#245c42" />
                      </>
                    )}
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
                  width={48}
                  tickFormatter={formatCompactGold}
                />
                {hasNegatives && hasPositives && (
                  <ReferenceLine
                    y={0}
                    stroke="rgba(30, 45, 38, 0.28)"
                    strokeDasharray="4 4"
                  />
                )}
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const point = payload[0]?.payload as
                      | { net?: number; fullLabel?: string }
                      | undefined
                    if (!point) return null
                    return (
                      <div className="chart-tooltip">
                        <p className="chart-tooltip-label">
                          {point.fullLabel ?? ''}
                        </p>
                        <p className="chart-tooltip-value">
                          Net: {formatGold(Number(point.net ?? 0))} gold
                        </p>
                      </div>
                    )
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="net"
                  stroke="url(#netStroke)"
                  strokeWidth={2.5}
                  fill="url(#netFill)"
                  baseValue={0}
                  isAnimationActive={false}
                  activeDot={{ r: 4, fill: '#245c42' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  )
}

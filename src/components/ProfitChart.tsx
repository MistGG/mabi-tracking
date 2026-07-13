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
import { formatDisplayDate, formatGold } from '../lib/finance'

type Props = {
  data: DailyProfit[]
}

export function ProfitChart({ data }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatDisplayDate(d.date),
  }))

  return (
    <section className="panel chart-panel">
      <header className="panel-header">
        <h2>Daily profit</h2>
        <p>Net gold after 4% market tax, grouped by day.</p>
      </header>

      {chartData.length === 0 ? (
        <div className="chart-empty">
          <p>Add sales to see your daily profit curve.</p>
        </div>
      ) : (
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2f6b4f" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#2f6b4f" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(30, 45, 38, 0.08)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#3d5248', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#3d5248', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={64}
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
                labelFormatter={(label) => String(label)}
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
      )}
    </section>
  )
}

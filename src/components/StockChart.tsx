'use client'

import { useState, useEffect, useId } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid,
} from 'recharts'

interface ChartPoint { date: string; close: number }
type Period = '1w' | '1m' | '3m'

const PERIODS: { key: Period; label: string }[] = [
  { key: '1w', label: '1주' },
  { key: '1m', label: '1개월' },
  { key: '3m', label: '3개월' },
]

interface Props {
  symbol: string
  avgPrice?: number
  high52?: number
  low52?: number
  isKrw?: boolean
}

export default function StockChart({ symbol, avgPrice, high52, low52, isKrw = false }: Props) {
  const [data, setData] = useState<ChartPoint[]>([])
  const [period, setPeriod] = useState<Period>('1m')
  const [loading, setLoading] = useState(true)
  const uid = useId().replace(/:/g, '')

  useEffect(() => {
    setLoading(true)
    setData([])
    fetch(`/api/stocks/chart?symbol=${encodeURIComponent(symbol)}&period=${period}`)
      .then(r => r.json())
      .then(d => { setData(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [symbol, period])

  const fmt = (v: number) =>
    isKrw ? '₩' + Math.round(v).toLocaleString() : '$' + v.toFixed(2)

  const curPrice = data.length ? data[data.length - 1].close : null
  const isAbove = avgPrice != null && curPrice != null && curPrice >= avgPrice
  const lineColor = avgPrice == null ? '#6366f1' : isAbove ? '#22c55e' : '#ef4444'

  const range52 = high52 != null && low52 != null ? high52 - low52 : null
  const pos52 = range52 && range52 > 0 && curPrice != null
    ? Math.round(((curPrice - low52!) / range52) * 100)
    : null
  const pos52Color = pos52 == null ? '' : pos52 >= 80 ? 'bg-red-400' : pos52 >= 50 ? 'bg-green-400' : 'bg-blue-400'
  const pos52Text  = pos52 == null ? '' : pos52 >= 80 ? 'text-red-500 dark:text-red-400' : pos52 >= 50 ? 'text-green-600 dark:text-green-400' : 'text-blue-500 dark:text-blue-400'

  return (
    <div className="space-y-3">
      {/* 기간 버튼 */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">주가 차트</span>
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                period === p.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 */}
      {loading ? (
        <div className="h-52 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-xl" />
      ) : data.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
          차트 데이터를 불러올 수 없습니다
        </div>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={lineColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={d => { const [, m, day] = d.split('-'); return `${m}/${day}` }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={isKrw ? 62 : 54}
                tickFormatter={v => isKrw ? '₩' + Math.round(v / 1000) + 'k' : '$' + v.toFixed(0)}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#111' }}
                formatter={((v: number) => [fmt(v), '종가']) as any}
                labelFormatter={((d: unknown) => String(d)) as any}
              />
              {avgPrice != null && (
                <ReferenceLine
                  y={avgPrice}
                  stroke={lineColor}
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  label={{ value: `매수가 ${fmt(avgPrice)}`, position: 'insideTopRight', fontSize: 10, fill: lineColor }}
                />
              )}
              <Area
                type="monotone"
                dataKey="close"
                stroke={lineColor}
                strokeWidth={2}
                fill={`url(#g${uid})`}
                dot={false}
                activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 52주 범위 바 */}
      {high52 != null && low52 != null && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 dark:text-gray-500">저점 {fmt(low52)}</span>
            {pos52 != null && (
              <span className={`font-semibold ${pos52Text}`}>52주 범위 {pos52}%</span>
            )}
            <span className="text-gray-400 dark:text-gray-500">고점 {fmt(high52)}</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            {pos52 != null && (
              <div
                className={`h-full rounded-full transition-all ${pos52Color}`}
                style={{ width: `${Math.min(pos52, 100)}%` }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

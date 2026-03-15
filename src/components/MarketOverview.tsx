'use client'

import { useEffect, useState } from 'react'

interface MarketData {
  fearGreedIndex: number | null
  fearGreedLabel: string | null
  buffettIndicator: number | null
  vix: number | null
  gold: number | null
  oil: number | null
  dxy: number | null
  treasury10y: number | null
  fedFunds: number | null
  unemployment: number | null
  cpiYoy: number | null
}

function getFearGreedColor(score: number | null) {
  if (score == null) return 'text-gray-500'
  if (score < 25) return 'text-red-600'
  if (score < 45) return 'text-orange-500'
  if (score < 55) return 'text-yellow-600'
  if (score < 75) return 'text-green-500'
  return 'text-green-600'
}

function getFearGreedKor(score: number | null) {
  if (score == null) return '-'
  if (score < 25) return '극공포'
  if (score < 45) return '공포'
  if (score < 55) return '중립'
  if (score < 75) return '탐욕'
  return '극탐욕'
}

function getBuffettLabel(v: number | null) {
  if (v == null) return '-'
  if (v < 80) return '저평가'
  if (v < 100) return '보통'
  if (v < 120) return '약간 고평가'
  if (v < 150) return '고평가'
  return '심각한 고평가'
}

function getBuffettColor(v: number | null) {
  if (v == null) return 'text-gray-500'
  if (v < 80) return 'text-green-600'
  if (v < 100) return 'text-green-500'
  if (v < 120) return 'text-yellow-600'
  if (v < 150) return 'text-orange-500'
  return 'text-red-600'
}

function getVixLabel(v: number | null) {
  if (v == null) return '-'
  if (v < 15) return '저변동'
  if (v < 20) return '보통'
  if (v < 30) return '불안'
  return '극심한 공포'
}

function getVixColor(v: number | null) {
  if (v == null) return 'text-gray-500'
  if (v < 15) return 'text-green-500'
  if (v < 20) return 'text-yellow-600'
  if (v < 30) return 'text-orange-500'
  return 'text-red-600'
}

function Tile({ title, value, sub, subColor = 'text-gray-500', loading }: {
  title: string; value: string; sub?: string; subColor?: string; loading: boolean
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</div>
      {loading ? (
        <div className="h-7 bg-gray-100 dark:bg-gray-700 animate-pulse rounded mt-1" />
      ) : (
        <>
          <div className="text-xl font-bold text-gray-800 dark:text-gray-100 leading-tight">{value}</div>
          {sub && <div className={`text-xs mt-0.5 ${subColor}`}>{sub}</div>}
        </>
      )}
    </div>
  )
}

export default function MarketOverview() {
  const [data, setData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/market')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const d = data

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400">시장 지표</h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">주식·ETF 실시간 / FRED 일별~분기</span>
      </div>

      {/* 시장심리 */}
      <div className="grid grid-cols-2 gap-3">
        <Tile
          title="CNN 공포탐욕지수"
          value={d?.fearGreedIndex != null ? String(d.fearGreedIndex) : 'N/A'}
          sub={d?.fearGreedIndex != null ? getFearGreedKor(d.fearGreedIndex) : '데이터 없음'}
          subColor={getFearGreedColor(d?.fearGreedIndex ?? null)}
          loading={loading}
        />
        <Tile
          title={`VIX (변동성)`}
          value={d?.vix != null ? d.vix.toFixed(2) : 'N/A'}
          sub={getVixLabel(d?.vix ?? null)}
          subColor={getVixColor(d?.vix ?? null)}
          loading={loading}
        />
      </div>

      {/* 거시경제 */}
      <div className="grid grid-cols-2 gap-3">
        <Tile
          title="버핏지수 (시총/GDP)"
          value={d?.buffettIndicator != null ? `${d.buffettIndicator}%` : 'N/A'}
          sub={getBuffettLabel(d?.buffettIndicator ?? null)}
          subColor={getBuffettColor(d?.buffettIndicator ?? null)}
          loading={loading}
        />
        <Tile
          title="미국 국채 10년"
          value={d?.treasury10y != null ? `${d.treasury10y.toFixed(2)}%` : 'N/A'}
          sub={d?.treasury10y != null ? (d.treasury10y > 4.5 ? '고금리 구간' : d.treasury10y > 3.5 ? '보통' : '저금리 구간') : '-'}
          loading={loading}
        />
      </div>

      {/* 금리·경제 */}
      <div className="grid grid-cols-3 gap-3">
        <Tile
          title="기준금리 (Fed)"
          value={d?.fedFunds != null ? `${d.fedFunds.toFixed(2)}%` : 'N/A'}
          loading={loading}
        />
        <Tile
          title="CPI (전년비)"
          value={d?.cpiYoy != null ? `${d.cpiYoy.toFixed(1)}%` : 'N/A'}
          sub={d?.cpiYoy != null ? (d.cpiYoy > 3 ? '인플레 높음' : d.cpiYoy > 2 ? '목표 상단' : '안정') : '-'}
          subColor={d?.cpiYoy != null ? (d.cpiYoy > 3 ? 'text-red-500' : d.cpiYoy > 2 ? 'text-yellow-600' : 'text-green-600') : 'text-gray-400'}
          loading={loading}
        />
        <Tile
          title="실업률"
          value={d?.unemployment != null ? `${d.unemployment.toFixed(1)}%` : 'N/A'}
          sub={d?.unemployment != null ? (d.unemployment > 5 ? '경기 침체 우려' : d.unemployment > 4 ? '보통' : '완전고용') : '-'}
          loading={loading}
        />
      </div>

      {/* 원자재·달러 */}
      <div className="grid grid-cols-3 gap-3">
        <Tile
          title="금 (oz)"
          value={d?.gold != null ? `$${Math.round(d.gold).toLocaleString()}` : 'N/A'}
          loading={loading}
        />
        <Tile
          title="WTI 원유 (배럴)"
          value={d?.oil != null ? `$${d.oil.toFixed(2)}` : 'N/A'}
          loading={loading}
        />
        <Tile
          title="달러인덱스 (DXY)"
          value={d?.dxy != null ? d.dxy.toFixed(2) : 'N/A'}
          sub={d?.dxy != null ? (d.dxy > 105 ? '달러 강세' : d.dxy > 98 ? '보통' : '달러 약세') : '-'}
          loading={loading}
        />
      </div>
    </div>
  )
}

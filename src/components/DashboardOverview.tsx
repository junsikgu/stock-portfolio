'use client'

import { useState, useEffect } from 'react'
import { PortfolioHolding } from '@/types'
import Link from 'next/link'

interface Quote {
  price: number
  change: number
  changePercent: number
  high52?: number
  low52?: number
}

interface AI {
  score: number
  recommendation: string
}

interface MarketData {
  vix: number | null
  fearGreedIndex: number | null
  fearGreedLabel: string | null
  buffettIndicator: number | null
}

const REC = {
  STRONG_BUY: { label: '적극매수', dot: 'bg-green-500', badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700', row: 'border-l-green-500' },
  BUY:        { label: '매수',     dot: 'bg-green-400', badge: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-700',  row: 'border-l-green-400' },
  HOLD:       { label: '관망',     dot: 'bg-yellow-400', badge: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700', row: 'border-l-yellow-400' },
  SELL:       { label: '매도',     dot: 'bg-red-400',   badge: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700',    row: 'border-l-red-400' },
  STRONG_SELL:{ label: '적극매도', dot: 'bg-red-600',   badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700',  row: 'border-l-red-600' },
} as const

function isKrwStock(s: string) { return s.endsWith('.KS') || s.endsWith('.KQ') }
function fmtPrice(price: number, symbol: string) {
  return isKrwStock(symbol) ? '₩' + Math.round(price).toLocaleString() : '$' + price.toFixed(2)
}

function getMarketBanner(vix: number | null, fg: number | null): { text: string; bg: string; icon: string } {
  if (vix != null && vix >= 30)  return { icon: '🚨', text: `시장 극심한 변동성 (VIX ${vix.toFixed(1)}) — 포지션 축소 및 리스크 관리 집중`, bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' }
  if (fg  != null && fg  < 25)   return { icon: '📉', text: `시장 극공포 구간 (공포탐욕 ${fg}) — 역발상 저가매수 기회일 수 있어요`, bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' }
  if (fg  != null && fg  < 40)   return { icon: '😨', text: `시장 공포 구간 (공포탐욕 ${fg}) — 신중한 접근 필요, 분할 매수 고려`, bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300' }
  if (vix != null && vix >= 25)  return { icon: '⚠️', text: `변동성 주의 구간 (VIX ${vix.toFixed(1)}) — 선택적 접근 권장`, bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300' }
  if (fg  != null && fg  > 75)   return { icon: '🔥', text: `시장 극탐욕 구간 (공포탐욕 ${fg}) — 고점 주의, 차익실현 고려`, bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' }
  if (fg  != null && fg  > 60)   return { icon: '📈', text: `시장 탐욕 구간 (공포탐욕 ${fg}) — 상승 지속 가능, 조정 대비 필요`, bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300' }
  if (vix != null && vix < 15)   return { icon: '✅', text: `시장 안정 구간 (VIX ${vix.toFixed(1)}) — 트렌드 추종 전략 유효`, bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' }
  return { icon: '📊', text: '시장 중립 구간 — 종목별 선별적 접근 권장', bg: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300' }
}

function getSpotlight(
  holdings: PortfolioHolding[],
  quotes: Record<string, Quote>,
  analyses: Record<string, AI>
): { holding: PortfolioHolding; quote: Quote; ai: AI | null; reason: string; reasonColor: string } | null {
  const candidates = holdings.filter(h => quotes[h.symbol])
  if (!candidates.length) return null

  // 1순위: SELL 신호 + 오늘 상승 → 랠리 매도 기회
  const sellRally = candidates.find(h =>
    ['SELL', 'STRONG_SELL'].includes(analyses[h.symbol]?.recommendation) &&
    (quotes[h.symbol]?.changePercent ?? 0) > 1.5
  )
  if (sellRally) return {
    holding: sellRally, quote: quotes[sellRally.symbol], ai: analyses[sellRally.symbol] ?? null,
    reason: '매도 신호인데 오늘 상승 중 — 랠리 매도 기회',
    reasonColor: 'text-red-600 dark:text-red-400',
  }

  // 2순위: BUY 신호 + 오늘 하락 → 저가매수 기회
  const buyDip = candidates.find(h =>
    ['STRONG_BUY', 'BUY'].includes(analyses[h.symbol]?.recommendation) &&
    (quotes[h.symbol]?.changePercent ?? 0) < -2
  )
  if (buyDip) return {
    holding: buyDip, quote: quotes[buyDip.symbol], ai: analyses[buyDip.symbol] ?? null,
    reason: '매수 신호인데 오늘 하락 중 — 저가 매수 기회',
    reasonColor: 'text-green-600 dark:text-green-400',
  }

  // 3순위: 오늘 가장 큰 변동
  const sorted = [...candidates].sort((a, b) =>
    Math.abs(quotes[b.symbol]?.changePercent ?? 0) - Math.abs(quotes[a.symbol]?.changePercent ?? 0)
  )
  const top = sorted[0]
  if (!top) return null
  const chg = quotes[top.symbol]?.changePercent ?? 0
  return {
    holding: top, quote: quotes[top.symbol], ai: analyses[top.symbol] ?? null,
    reason: chg >= 0 ? `오늘 +${chg.toFixed(1)}% 상승 — 가장 큰 변동 종목` : `오늘 ${chg.toFixed(1)}% 하락 — 가장 큰 변동 종목`,
    reasonColor: chg >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
  }
}

export default function DashboardOverview({ holdings }: { holdings: PortfolioHolding[] }) {
  const [quotes, setQuotes]     = useState<Record<string, Quote>>({})
  const [analyses, setAnalyses] = useState<Record<string, AI>>({})
  const [loaded, setLoaded]     = useState(0)
  const [total, setTotal]       = useState(0)

  const [marketData, setMarketData]       = useState<MarketData | null>(null)
  const [prevScore, setPrevScore]         = useState<number | null>(null)
  const [portfolioAnalysis, setPortfolioAnalysis]         = useState('')
  const [portfolioAnalysisLoading, setPortfolioAnalysisLoading] = useState(false)
  const [analysisRequested, setAnalysisRequested]         = useState(false)

  // 1. 시장 지표 빠르게 fetch
  useEffect(() => {
    fetch('/api/market')
      .then(r => r.json())
      .then(d => setMarketData({ vix: d.vix, fearGreedIndex: d.fearGreedIndex, fearGreedLabel: d.fearGreedLabel, buffettIndicator: d.buffettIndicator }))
      .catch(() => {})
  }, [])

  // 2. 종목별 시세 + AI 점수
  useEffect(() => {
    if (holdings.length === 0) return
    const symbols = [...new Set(holdings.map(h => h.symbol))]
    setTotal(symbols.length * 2)
    symbols.forEach(async (symbol) => {
      try {
        const res  = await fetch(`/api/stocks/quote?symbol=${encodeURIComponent(symbol)}`)
        const data = await res.json()
        if (data.price) setQuotes(prev => ({ ...prev, [symbol]: data }))
      } catch {}
      setLoaded(prev => prev + 1)

      try {
        const res  = await fetch(`/api/analysis?symbol=${encodeURIComponent(symbol)}`)
        const data = await res.json()
        if (data.score != null) setAnalyses(prev => ({ ...prev, [symbol]: { score: data.score, recommendation: data.recommendation } }))
      } catch {}
      setLoaded(prev => prev + 1)
    })
  }, [holdings])

  // 3. 점수 변화 추적 (localStorage)
  const aiScores      = holdings.map(h => analyses[h.symbol]?.score).filter((s): s is number => s != null)
  const portfolioScore = aiScores.length > 0 ? Math.round(aiScores.reduce((a, b) => a + b, 0) / aiScores.length) : null

  useEffect(() => {
    if (portfolioScore == null || typeof window === 'undefined') return
    const today   = new Date().toISOString().split('T')[0]
    const stored  = JSON.parse(localStorage.getItem('portfolioScoreHistory') || '{}')
    const prev    = Object.entries(stored).filter(([d]) => d < today).sort(([a], [b]) => b.localeCompare(a))[0]
    if (prev) setPrevScore(prev[1] as number)
    const updated = { ...stored, [today]: portfolioScore }
    const trimmed = Object.fromEntries(Object.entries(updated).sort(([a], [b]) => b.localeCompare(a)).slice(0, 7))
    localStorage.setItem('portfolioScoreHistory', JSON.stringify(trimmed))
  }, [portfolioScore])

  // 4. 포트폴리오 종합 AI 분석 (종목 분석 완료 후)
  useEffect(() => {
    if (holdings.length === 0 || analysisRequested) return
    const symbols = [...new Set(holdings.map(h => h.symbol))]
    if (!symbols.every(s => analyses[s] != null && quotes[s] != null)) return
    setAnalysisRequested(true)
    setPortfolioAnalysisLoading(true)
    fetch('/api/analysis/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        holdings: holdings.map(h => ({ symbol: h.symbol, name: h.name, quantity: h.quantity, avg_price: h.avg_price })),
        quotes, analyses,
      }),
    })
      .then(r => r.json())
      .then(d => { if (d.analysis) setPortfolioAnalysis(d.analysis) })
      .catch(() => {})
      .finally(() => setPortfolioAnalysisLoading(false))
  }, [analyses, quotes, holdings, analysisRequested])

  if (holdings.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 text-center">
        <div className="text-5xl mb-3">💼</div>
        <p className="text-gray-500 dark:text-gray-400 mb-4">포트폴리오가 비어있어요</p>
        <Link href="/dashboard/portfolio" className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
          종목 추가하기 →
        </Link>
      </div>
    )
  }

  const loadPct    = total > 0 ? Math.round((loaded / total) * 100) : 0
  const isLoading  = loaded < total

  const dangerHoldings = holdings.filter(h => ['SELL', 'STRONG_SELL'].includes(analyses[h.symbol]?.recommendation))
  const buyHoldings    = holdings.filter(h => ['STRONG_BUY', 'BUY'].includes(analyses[h.symbol]?.recommendation))
  const holdHoldings   = holdings.filter(h => analyses[h.symbol]?.recommendation === 'HOLD')

  const scoreColor = portfolioScore == null ? 'text-gray-400 dark:text-gray-500'
    : portfolioScore >= 60 ? 'text-green-600 dark:text-green-400'
    : portfolioScore >= 40 ? 'text-yellow-600 dark:text-yellow-400'
    : 'text-red-600 dark:text-red-400'

  const scoreBg = portfolioScore == null ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'
    : portfolioScore >= 60 ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10 border-green-200 dark:border-green-800'
    : portfolioScore >= 40 ? 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/10 border-yellow-200 dark:border-yellow-800'
    : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/10 border-red-200 dark:border-red-800'

  const scoreDelta  = portfolioScore != null && prevScore != null ? portfolioScore - prevScore : null
  const spotlight   = !isLoading ? getSpotlight(holdings, quotes, analyses) : null
  const banner      = marketData ? getMarketBanner(marketData.vix, marketData.fearGreedIndex) : null

  return (
    <div className="space-y-3">

      {/* ─── 시장 한 줄 요약 배너 ─── */}
      {banner ? (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${banner.bg}`}>
          <span className="text-base flex-shrink-0">{banner.icon}</span>
          <span>{banner.text}</span>
        </div>
      ) : (
        <div className="h-10 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-xl" />
      )}

      {/* ─── AI 점수 카드 ─── */}
      <div className={`rounded-2xl p-5 border ${scoreBg}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">포트폴리오 AI 점수</div>
            {isLoading && portfolioScore == null ? (
              <div className="flex items-end gap-2">
                <div className="w-20 h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">분석 중... {loadPct}%</div>
              </div>
            ) : (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className={`text-5xl font-black ${scoreColor}`}>{portfolioScore ?? '—'}</span>
                <span className="text-lg text-gray-400 dark:text-gray-500 font-light">/ 100</span>
                {/* 전일 대비 */}
                {scoreDelta != null && (
                  <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                    scoreDelta > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                    scoreDelta < 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-500'
                  }`}>
                    {scoreDelta > 0 ? `▲ +${scoreDelta}` : scoreDelta < 0 ? `▼ ${scoreDelta}` : '→ 0'} (전일 {prevScore}점)
                  </span>
                )}
                {isLoading && <span className="text-xs text-gray-400 dark:text-gray-500">({loadPct}%)</span>}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <div className="text-xs text-gray-400 dark:text-gray-500">{holdings.length}종목 보유</div>
            <div className="flex gap-1.5 flex-wrap justify-end">
              {buyHoldings.length > 0  && <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full font-semibold">매수 {buyHoldings.length}</span>}
              {holdHoldings.length > 0 && <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2.5 py-1 rounded-full font-semibold">관망 {holdHoldings.length}</span>}
              {dangerHoldings.length > 0 && <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2.5 py-1 rounded-full font-semibold">매도 {dangerHoldings.length}</span>}
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="mt-3 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${loadPct}%` }} />
          </div>
        )}

        {/* Groq 포트폴리오 종합 의견 */}
        {(portfolioAnalysisLoading || portfolioAnalysis) && (
          <div className="mt-4 pt-4 border-t border-white/30 dark:border-gray-700/50">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded">Groq</span>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">포트폴리오 종합 의견</span>
            </div>
            {portfolioAnalysisLoading ? (
              <div className="space-y-2">
                {[100, 80, 65].map((w, i) => (
                  <div key={i} className={`h-3 bg-white/50 dark:bg-gray-700 animate-pulse rounded`} style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {portfolioAnalysis.split('\n').filter(p => p.trim()).map((line, i) => {
                  const isConclusion = line.startsWith('종합의견:')
                  const isBuy  = isConclusion && line.includes('매수')
                  const isSell = isConclusion && line.includes('매도')
                  const isHold = isConclusion && !isBuy && !isSell
                  return (
                    <p key={i} className={
                      isConclusion
                        ? `text-sm font-bold mt-1 px-2 py-1.5 rounded-lg ${
                            isBuy  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                            isSell ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' :
                            'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                          }`
                        : 'text-xs text-gray-600 dark:text-gray-300 leading-relaxed'
                    }>{line}</p>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── 오늘 주목할 종목 ─── */}
      {spotlight && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <span className="text-sm">🔍</span>
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">오늘 주목할 종목</span>
          </div>
          <Link href="/dashboard/portfolio" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-800 dark:text-gray-100">{spotlight.holding.symbol}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{spotlight.holding.name}</span>
              </div>
              <div className={`text-xs mt-0.5 font-medium ${spotlight.reasonColor}`}>{spotlight.reason}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-bold text-gray-800 dark:text-gray-100 text-sm">
                {fmtPrice(spotlight.quote.price, spotlight.holding.symbol)}
              </div>
              <div className={`text-xs font-semibold ${spotlight.quote.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {spotlight.quote.changePercent >= 0 ? '+' : ''}{spotlight.quote.changePercent?.toFixed(2)}%
              </div>
            </div>
            {spotlight.ai && (
              <div className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full border ${
                REC[spotlight.ai.recommendation as keyof typeof REC]?.badge || ''
              }`}>
                {spotlight.ai.score} · {REC[spotlight.ai.recommendation as keyof typeof REC]?.label}
              </div>
            )}
          </Link>
        </div>
      )}

      {/* ─── 위험 종목 경고 ─── */}
      {dangerHoldings.length > 0 && !isLoading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-base">⚠️</span>
            <span className="text-red-700 dark:text-red-400 font-semibold text-sm">매도 신호 종목</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {dangerHoldings.map(h => {
              const ai = analyses[h.symbol]; const q = quotes[h.symbol]
              const style = ai ? REC[ai.recommendation as keyof typeof REC] : null
              return (
                <Link key={h.id} href="/dashboard/portfolio"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${style?.badge || ''} transition-opacity hover:opacity-80`}>
                  <span className="font-bold text-sm">{h.symbol}</span>
                  {ai && <span className="font-semibold text-xs">{ai.score}점 · {style?.label}</span>}
                  {q  && <span className="text-xs opacity-70">{q.changePercent >= 0 ? '+' : ''}{q.changePercent?.toFixed(1)}%</span>}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── 종목별 리스트 ─── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">보유 종목</h3>
          <Link href="/dashboard/portfolio" className="text-blue-600 dark:text-blue-400 text-xs hover:underline font-medium">상세 포트폴리오 →</Link>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {holdings.map(h => {
            const q = quotes[h.symbol]; const ai = analyses[h.symbol]
            const style = ai ? REC[ai.recommendation as keyof typeof REC] : null
            const costBasis = h.avg_price * h.quantity
            const currentValue = q ? q.price * h.quantity : null
            const pnlPct = currentValue != null && costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : null
            return (
              <div key={h.id} className={`flex items-center px-4 py-3 gap-3 border-l-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30 ${style ? style.row : 'border-l-gray-200 dark:border-l-gray-600'}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-tight">{h.symbol}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 truncate leading-tight mt-0.5">{h.name}</div>
                </div>
                <div className="flex-shrink-0">
                  {isLoading && !ai ? (
                    <div className="w-20 h-5 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-full" />
                  ) : ai ? (
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${style?.badge || ''}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${style?.dot || ''}`} />
                      {ai.score} · {style?.label}
                    </span>
                  ) : null}
                </div>
                <div className="text-right flex-shrink-0">
                  {q ? (
                    <>
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-tight">{fmtPrice(q.price, h.symbol)}</div>
                      <div className={`text-xs leading-tight ${q.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {q.changePercent >= 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%
                      </div>
                    </>
                  ) : <div className="w-14 h-8 bg-gray-100 dark:bg-gray-700 animate-pulse rounded" />}
                </div>
                {pnlPct != null ? (
                  <div className={`text-xs font-semibold min-w-[46px] text-right flex-shrink-0 ${pnlPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                  </div>
                ) : <div className="min-w-[46px]" />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

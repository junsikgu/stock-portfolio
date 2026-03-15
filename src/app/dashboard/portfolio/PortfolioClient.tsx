'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PortfolioHolding } from '@/types'
import StockSearch from '@/components/StockSearch'
import AnalysisCard from '@/components/AnalysisCard'

interface StockQuote {
  price: number
  change: number
  changePercent: number
  high52?: number
  low52?: number
}

interface AiSummary {
  score: number
  recommendation: string
}

interface NewsItem {
  title: string
  link: string
  publisher: string
  publishedAt?: number | string
}

const REC_STYLE: Record<string, { label: string; bg: string; text: string; border: string; leftBar: string }> = {
  STRONG_BUY: { label: '적극매수', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-700', leftBar: 'bg-green-500' },
  BUY:        { label: '매수',     bg: 'bg-green-50 dark:bg-green-900/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-700', leftBar: 'bg-green-400' },
  HOLD:       { label: '관망',     bg: 'bg-yellow-50 dark:bg-yellow-900/10', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-700', leftBar: 'bg-yellow-400' },
  SELL:       { label: '매도',     bg: 'bg-red-50 dark:bg-red-900/20',   text: 'text-red-600 dark:text-red-400',   border: 'border-red-200 dark:border-red-700',   leftBar: 'bg-red-400' },
  STRONG_SELL:{ label: '적극매도', bg: 'bg-red-100 dark:bg-red-900/30',   text: 'text-red-700 dark:text-red-400',   border: 'border-red-300 dark:border-red-700',   leftBar: 'bg-red-600' },
}

interface Props {
  initialHoldings: PortfolioHolding[]
}

function isKrwStock(symbol: string) {
  return symbol.endsWith('.KS') || symbol.endsWith('.KQ')
}

function timeAgo(ts: number | string | undefined) {
  if (!ts) return ''
  // ts가 초 단위 Unix 타임스탬프(number)이거나 ISO 문자열(string)일 수 있음
  const ms = typeof ts === 'number' ? ts * 1000 : new Date(ts).getTime()
  if (isNaN(ms)) return ''
  const diff = Math.floor((Date.now() - ms) / 3600000)
  if (diff < 1) return '방금 전'
  if (diff < 24) return `${diff}시간 전`
  return `${Math.floor(diff / 24)}일 전`
}

export default function PortfolioClient({ initialHoldings }: Props) {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>(initialHoldings)
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({})
  const [analyses, setAnalyses] = useState<Record<string, AiSummary>>({})
  const [news, setNews] = useState<Record<string, NewsItem[]>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [addForm, setAddForm] = useState({ symbol: '', name: '', quantity: '', avg_price: '' })
  const [adding, setAdding] = useState(false)
  const [showKRW, setShowKRW] = useState(false)
  const [usdKrw, setUsdKrw] = useState<number>(1350)

  // 편집 상태
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [editAvgPrice, setEditAvgPrice] = useState('')
  const [editTarget, setEditTarget] = useState('')
  const [editMemo, setEditMemo] = useState('')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetch('/api/stocks/quote?symbol=KRW%3DX')
      .then(r => r.json())
      .then(d => { if (d.price && d.price > 100) setUsdKrw(d.price) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (holdings.length === 0) return
    const symbols = [...new Set(holdings.map(h => h.symbol))]
    symbols.forEach(async (symbol) => {
      try {
        const res = await fetch(`/api/stocks/quote?symbol=${encodeURIComponent(symbol)}`)
        const data = await res.json()
        setQuotes(prev => ({ ...prev, [symbol]: data }))
      } catch {}
    })
  }, [holdings])

  useEffect(() => {
    if (holdings.length === 0) return
    const symbols = [...new Set(holdings.map(h => h.symbol))]
    symbols.forEach(async (symbol) => {
      try {
        const res = await fetch(`/api/analysis?symbol=${encodeURIComponent(symbol)}`)
        const data = await res.json()
        if (data.score != null && data.recommendation) {
          setAnalyses(prev => ({ ...prev, [symbol]: { score: data.score, recommendation: data.recommendation } }))
        }
      } catch {}
    })
  }, [holdings])

  // 종목 선택 시 뉴스 fetch
  useEffect(() => {
    if (!selectedSymbol || news[selectedSymbol]) return
    fetch(`/api/stocks/news?symbol=${encodeURIComponent(selectedSymbol)}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setNews(prev => ({ ...prev, [selectedSymbol]: data })) })
      .catch(() => {})
  }, [selectedSymbol])

  function fmtPrice(price: number, symbol: string): string {
    const krw = isKrwStock(symbol)
    if (showKRW) {
      const krwVal = krw ? price : price * usdKrw
      return '₩' + Math.round(krwVal).toLocaleString()
    }
    if (krw) return '₩' + Math.round(price).toLocaleString()
    return '$' + price.toFixed(2)
  }

  function fmtTotal(usdVal: number) {
    if (showKRW) return '₩' + Math.round(usdVal * usdKrw).toLocaleString()
    return '$' + usdVal.toFixed(0)
  }

  async function handleAdd() {
    if (!addForm.symbol || !addForm.quantity || !addForm.avg_price) return
    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('portfolio_holdings')
      .insert({
        user_id: user!.id,
        symbol: addForm.symbol,
        name: addForm.name,
        quantity: parseFloat(addForm.quantity),
        avg_price: parseFloat(addForm.avg_price),
      })
      .select()
      .single()
    if (!error && data) {
      setHoldings(prev => [data, ...prev])
      setAddForm({ symbol: '', name: '', quantity: '', avg_price: '' })
      setShowAdd(false)
    }
    setAdding(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('portfolio_holdings').delete().eq('id', id)
    if (!error) {
      setHoldings(prev => prev.filter(h => h.id !== id))
      if (selectedSymbol && holdings.find(h => h.id === id)?.symbol === selectedSymbol) setSelectedSymbol(null)
    }
  }

  function startEdit(h: PortfolioHolding) {
    setEditingId(h.id)
    setEditQuantity(String(h.quantity))
    setEditAvgPrice(String(h.avg_price))
    setEditTarget(h.target_price != null ? String(h.target_price) : '')
    setEditMemo(h.memo || '')
  }

  async function saveEdit(id: string) {
    setSaving(true)
    const updates = {
      quantity: parseFloat(editQuantity) || 0,
      avg_price: parseFloat(editAvgPrice) || 0,
      target_price: editTarget ? parseFloat(editTarget) : null,
      memo: editMemo.trim() || null,
    }
    const { error } = await supabase.from('portfolio_holdings').update(updates).eq('id', id)
    if (!error) setHoldings(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
    setSaving(false)
    setEditingId(null)
  }

  function calcPnl(holding: PortfolioHolding, quote: StockQuote | undefined) {
    if (!quote) return null
    const currentValue = quote.price * holding.quantity
    const costBasis = holding.avg_price * holding.quantity
    const pnl = currentValue - costBasis
    const pnlPct = (pnl / costBasis) * 100
    return { pnl, pnlPct, currentValue }
  }

  function calc52wPct(quote: StockQuote | undefined) {
    if (!quote || !quote.high52 || !quote.low52) return null
    const range = quote.high52 - quote.low52
    if (range === 0) return null
    return Math.round(((quote.price - quote.low52) / range) * 100)
  }

  const totalCost = holdings.reduce((sum, h) => {
    const krw = isKrwStock(h.symbol)
    return sum + (krw ? h.avg_price / usdKrw : h.avg_price) * h.quantity
  }, 0)

  const totalCurrentValue = holdings.reduce((sum, h) => {
    const q = quotes[h.symbol]
    const price = q ? q.price : h.avg_price
    const krw = isKrwStock(h.symbol)
    return sum + (krw ? price / usdKrw : price) * h.quantity
  }, 0)

  const totalPnl = totalCurrentValue - totalCost
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

  const aiScores = holdings.map(h => analyses[h.symbol]?.score).filter((s): s is number => s != null)
  const portfolioScore = aiScores.length > 0 ? Math.round(aiScores.reduce((a, b) => a + b, 0) / aiScores.length) : null

  function getScoreColor(score: number) {
    if (score >= 60) return 'text-green-600 dark:text-green-400'
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  function getScoreBg(score: number) {
    if (score >= 60) return 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800'
    if (score >= 40) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800'
    return 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">내 포트폴리오</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-0.5">보유 종목의 수익률을 추적하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKRW(v => !v)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              showKRW
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-400'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
            }`}
            title={showKRW ? `1 USD = ₩${Math.round(usdKrw).toLocaleString()}` : '원화로 보기'}
          >
            {showKRW ? `₩ (${Math.round(usdKrw).toLocaleString()})` : '$ → ₩'}
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + 종목 추가
          </button>
        </div>
      </div>

      {/* 요약 카드 */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">총 평가금액</div>
            <div className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">{fmtTotal(totalCurrentValue)}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">총 투자금액</div>
            <div className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">{fmtTotal(totalCost)}</div>
          </div>
          <div className={`rounded-xl p-3 sm:p-4 shadow-sm border ${totalPnl >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'}`}>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">총 손익</div>
            <div className={`text-lg sm:text-xl font-bold ${totalPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {totalPnl >= 0 ? '+' : '-'}{fmtTotal(Math.abs(totalPnl))}
            </div>
            <div className={`text-xs ${totalPnlPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%
            </div>
          </div>
          <div className={`rounded-xl p-3 sm:p-4 shadow-sm border ${portfolioScore != null ? getScoreBg(portfolioScore) : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">AI 점수</div>
            {portfolioScore != null ? (
              <div className={`text-lg sm:text-xl font-bold ${getScoreColor(portfolioScore)}`}>
                {portfolioScore}점
                <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1">/{aiScores.length}</span>
              </div>
            ) : (
              <div className="w-20 h-7 bg-gray-100 dark:bg-gray-700 animate-pulse rounded mt-1" />
            )}
          </div>
        </div>
      )}

      {/* 종목 추가 폼 */}
      {showAdd && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200">종목 추가</h3>
          <StockSearch
            onSelect={(r) => setAddForm(prev => ({ ...prev, symbol: r.symbol, name: r.name }))}
            placeholder="종목 검색 (예: 삼성전자, AAPL, Tesla)"
          />
          {addForm.symbol && (
            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">선택됨: {addForm.symbol} — {addForm.name}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">수량</label>
              <input
                type="number"
                value={addForm.quantity}
                onChange={(e) => setAddForm(prev => ({ ...prev, quantity: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0" min="0" step="0.001"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                평균매수가 ({isKrwStock(addForm.symbol) ? '₩' : '$'})
              </label>
              <input
                type="number"
                value={addForm.avg_price}
                onChange={(e) => setAddForm(prev => ({ ...prev, avg_price: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00" min="0"
                step={isKrwStock(addForm.symbol) ? '1' : '0.01'}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={adding || !addForm.symbol}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {adding ? '추가 중...' : '추가'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setAddForm({ symbol: '', name: '', quantity: '', avg_price: '' }) }}
              className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 보유 종목 */}
      {holdings.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="text-4xl mb-3">💼</div>
          <p className="text-gray-500 dark:text-gray-400">보유 종목이 없습니다. 종목을 추가해보세요!</p>
        </div>
      ) : (
        <>
          {/* ─── 모바일 카드 뷰 (md 미만) ─── */}
          <div className="block md:hidden space-y-3">
            {holdings.map((h) => {
              const q = quotes[h.symbol]
              const pnlData = calcPnl(h, q)
              const ai = analyses[h.symbol]
              const recStyle = ai ? REC_STYLE[ai.recommendation] : null
              const w52pct = calc52wPct(q)
              const krw = isKrwStock(h.symbol)
              const targetPct = h.target_price && q ? ((h.target_price - q.price) / q.price) * 100 : null
              const isEditing = editingId === h.id

              const displayPnl = pnlData
                ? (krw
                    ? (showKRW ? pnlData.pnl : pnlData.pnl / usdKrw)
                    : (showKRW ? pnlData.pnl * usdKrw : pnlData.pnl))
                : null
              const pnlPrefix = showKRW ? '₩' : '$'

              return (
                <div
                  key={h.id}
                  className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden transition-colors ${recStyle?.border || 'border-gray-100 dark:border-gray-700'}`}
                  onClick={() => !isEditing && setSelectedSymbol(selectedSymbol === h.symbol ? null : h.symbol)}
                >
                  {/* 상단 색상 바 */}
                  <div className={`h-1 w-full ${recStyle?.leftBar || 'bg-gray-200 dark:bg-gray-600'}`} />

                  <div className="p-4">
                    {/* 첫째 줄: 종목명 + AI 배지 + 버튼 */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-gray-800 dark:text-gray-100">{h.symbol}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{h.name}</div>
                        {h.memo && <div className="text-xs text-blue-500 dark:text-blue-400 mt-0.5 truncate">{h.memo}</div>}
                      </div>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        {ai && recStyle ? (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${recStyle.bg} ${recStyle.text} ${recStyle.border}`}>
                            {ai.score} {recStyle.label}
                          </span>
                        ) : (
                          <div className="w-20 h-5 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-full" />
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(h) }}
                          className="text-gray-300 hover:text-blue-400 transition-colors p-1"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(h.id) }}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1 text-lg leading-none"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {/* 둘째 줄: 가격 + 손익 */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold text-gray-800 dark:text-gray-100">
                          {q ? fmtPrice(q.price, h.symbol) : <span className="w-20 h-6 bg-gray-100 dark:bg-gray-700 animate-pulse rounded inline-block" />}
                        </div>
                        {q && (
                          <div className={`text-xs ${q.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            오늘 {q.changePercent >= 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%
                          </div>
                        )}
                      </div>
                      {displayPnl != null && pnlData ? (
                        <div className="text-right">
                          <div className={`font-bold ${pnlData.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {pnlData.pnl >= 0 ? '+' : '-'}{pnlPrefix}{Math.abs(Math.round(displayPnl)).toLocaleString()}
                          </div>
                          <div className={`text-xs ${pnlData.pnlPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {pnlData.pnlPct >= 0 ? '+' : ''}{pnlData.pnlPct.toFixed(2)}%
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* 52주 바 */}
                    {w52pct != null && (
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400 dark:text-gray-500">52주 저점</span>
                          <span className={`text-xs font-medium ${w52pct >= 80 ? 'text-red-500' : w52pct >= 50 ? 'text-green-500' : 'text-blue-500'}`}>{w52pct}%</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">고점</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                          <div
                            className={`h-2 rounded-full transition-all ${w52pct >= 80 ? 'bg-red-400' : w52pct >= 50 ? 'bg-green-400' : 'bg-blue-400'}`}
                            style={{ width: `${Math.min(w52pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* 목표가 */}
                    {h.target_price && q && targetPct != null && (
                      <div className={`mt-2 text-xs ${targetPct > 0 ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400'}`}>
                        목표가 {fmtPrice(h.target_price, h.symbol)} → {targetPct > 0 ? '+' : ''}{targetPct.toFixed(1)}% 남음
                      </div>
                    )}
                  </div>

                  {/* 편집 폼 */}
                  {isEditing && (
                    <div
                      className="border-t border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 p-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400">수량</label>
                          <input type="number" value={editQuantity} onChange={e => setEditQuantity(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mt-0.5"
                            min="0" step="0.001" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400">평균단가</label>
                          <input type="number" value={editAvgPrice} onChange={e => setEditAvgPrice(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mt-0.5"
                            min="0" step="0.01" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400">목표가</label>
                          <input type="number" value={editTarget} onChange={e => setEditTarget(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mt-0.5"
                            placeholder="선택" min="0" step="0.01" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400">메모</label>
                          <input type="text" value={editMemo} onChange={e => setEditMemo(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mt-0.5"
                            placeholder="메모..." maxLength={200} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(h.id)} disabled={saving}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-1.5 rounded text-sm font-medium">
                          {saving ? '저장 중...' : '저장'}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 py-1.5 rounded text-sm font-medium">
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ─── 데스크톱 테이블 뷰 (md 이상) ─── */}
          <div className="hidden md:block">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">종목</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">AI 점수</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">현재가</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">52주</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">수량</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">평균단가</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">평가금액</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">손익</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {holdings.map((h) => {
                      const q = quotes[h.symbol]
                      const pnlData = calcPnl(h, q)
                      const ai = analyses[h.symbol]
                      const recStyle = ai ? REC_STYLE[ai.recommendation] : null
                      const w52pct = calc52wPct(q)
                      const krw = isKrwStock(h.symbol)
                      const targetPct = h.target_price && q ? ((h.target_price - q.price) / q.price) * 100 : null
                      const isEditing = editingId === h.id

                      const displayAvg = krw
                        ? (showKRW ? '₩' + Math.round(h.avg_price).toLocaleString() : '$' + (h.avg_price / usdKrw).toFixed(2))
                        : (showKRW ? '₩' + Math.round(h.avg_price * usdKrw).toLocaleString() : '$' + h.avg_price.toFixed(2))
                      const displayValue = pnlData
                        ? (krw
                            ? (showKRW ? '₩' + Math.round(pnlData.currentValue).toLocaleString() : '$' + (pnlData.currentValue / usdKrw).toFixed(0))
                            : (showKRW ? '₩' + Math.round(pnlData.currentValue * usdKrw).toLocaleString() : '$' + pnlData.currentValue.toFixed(0)))
                        : '-'
                      const displayPnl = pnlData
                        ? (krw
                            ? (showKRW ? pnlData.pnl : pnlData.pnl / usdKrw)
                            : (showKRW ? pnlData.pnl * usdKrw : pnlData.pnl))
                        : null
                      const pnlPrefix = showKRW ? '₩' : '$'

                      const rowBg = recStyle
                        ? (ai?.recommendation === 'STRONG_SELL' || ai?.recommendation === 'SELL'
                            ? 'bg-red-50/30 dark:bg-red-900/10'
                            : ai?.recommendation === 'STRONG_BUY' || ai?.recommendation === 'BUY'
                            ? 'bg-green-50/30 dark:bg-green-900/10'
                            : '')
                        : ''

                      return (
                        <>
                          <tr
                            key={h.id}
                            className={`hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors ${selectedSymbol === h.symbol ? 'bg-blue-50 dark:bg-blue-900/20' : rowBg}`}
                            onClick={() => !isEditing && setSelectedSymbol(selectedSymbol === h.symbol ? null : h.symbol)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-1 h-8 rounded-full flex-shrink-0 ${recStyle?.leftBar || 'bg-gray-200 dark:bg-gray-600'}`} />
                                <div>
                                  <div className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{h.symbol}</div>
                                  <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-32">{h.name}</div>
                                  {h.memo && <div className="text-xs text-blue-500 dark:text-blue-400 truncate max-w-32 mt-0.5">{h.memo}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {recStyle && ai ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{ai.score}</span>
                                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${recStyle.bg} ${recStyle.text} ${recStyle.border}`}>
                                    {recStyle.label}
                                  </span>
                                </div>
                              ) : (
                                <div className="w-16 h-4 bg-gray-100 dark:bg-gray-700 animate-pulse rounded" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{q ? fmtPrice(q.price, h.symbol) : '-'}</div>
                              {q && (
                                <div className={`text-xs ${q.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {q.changePercent >= 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {w52pct != null ? (
                                <div>
                                  <div className={`text-xs font-medium ${w52pct >= 80 ? 'text-red-500' : w52pct >= 50 ? 'text-green-500' : 'text-blue-500'}`}>{w52pct}%</div>
                                  <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mt-1 ml-auto">
                                    <div
                                      className={`h-1.5 rounded-full ${w52pct >= 80 ? 'bg-red-400' : w52pct >= 50 ? 'bg-green-400' : 'bg-blue-400'}`}
                                      style={{ width: `${Math.min(w52pct, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              ) : <span className="text-xs text-gray-300 dark:text-gray-600">-</span>}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">{h.quantity}</td>
                            <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">{displayAvg}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{displayValue}</div>
                              {h.target_price && q && (
                                <div className={`text-xs ${targetPct != null && targetPct > 0 ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400'}`}>
                                  목표 {targetPct != null ? `${targetPct > 0 ? '+' : ''}${targetPct.toFixed(1)}%` : '-'}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {displayPnl != null && pnlData ? (
                                <div>
                                  <div className={`text-sm font-medium ${pnlData.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {pnlData.pnl >= 0 ? '+' : '-'}{pnlPrefix}{Math.abs(Math.round(displayPnl)).toLocaleString()}
                                  </div>
                                  <div className={`text-xs ${pnlData.pnlPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    ({pnlData.pnlPct >= 0 ? '+' : ''}{pnlData.pnlPct.toFixed(2)}%)
                                  </div>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); startEdit(h) }}
                                  className="text-gray-300 hover:text-blue-400 transition-colors text-sm px-1"
                                  title="편집"
                                >✏️</button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(h.id) }}
                                  className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                                >×</button>
                              </div>
                            </td>
                          </tr>

                          {/* 편집 행 */}
                          {isEditing && (
                            <tr key={`${h.id}-edit`} className="bg-blue-50 dark:bg-blue-900/20">
                              <td colSpan={9} className="px-4 py-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">수량</label>
                                    <input type="number" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-2 py-1 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      min="0" step="0.001" />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">평균단가</label>
                                    <input type="number" value={editAvgPrice} onChange={(e) => setEditAvgPrice(e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-2 py-1 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      min="0" step="0.01" />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">목표가</label>
                                    <input type="number" value={editTarget} onChange={(e) => setEditTarget(e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-2 py-1 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="선택" min="0" step="0.01" />
                                  </div>
                                  <div className="flex items-center gap-2 flex-1">
                                    <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">메모</label>
                                    <input type="text" value={editMemo} onChange={(e) => setEditMemo(e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded px-2 py-1 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="매수 이유, 목표 등..." maxLength={200} />
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); saveEdit(h.id) }} disabled={saving}
                                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-3 py-1 rounded text-xs font-medium">
                                      {saving ? '저장 중...' : '저장'}
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setEditingId(null) }}
                                      className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 px-3 py-1 rounded text-xs font-medium">
                                      취소
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ─── 종목 클릭 시 상세 패널 ─── */}
          {selectedSymbol && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-gray-700 dark:text-gray-200">{selectedSymbol}</span> 상세 분석
                <button onClick={() => setSelectedSymbol(null)} className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
              </p>

              <AnalysisCard symbol={selectedSymbol} />

              {/* 최신 뉴스 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">최신 뉴스</h3>
                </div>
                {!news[selectedSymbol] ? (
                  <div className="p-4 space-y-3">
                    {[0, 1].map(i => (
                      <div key={i} className="space-y-1.5">
                        <div className="h-4 bg-gray-100 dark:bg-gray-700 animate-pulse rounded w-full" />
                        <div className="h-3 bg-gray-100 dark:bg-gray-700 animate-pulse rounded w-24" />
                      </div>
                    ))}
                  </div>
                ) : news[selectedSymbol].length === 0 ? (
                  <div className="p-4 text-sm text-gray-400 dark:text-gray-500">뉴스를 찾을 수 없습니다</div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-gray-700">
                    {news[selectedSymbol].map((n, i) => (
                      <a key={i} href={n.link} target="_blank" rel="noopener noreferrer"
                        className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <div className="text-sm text-gray-800 dark:text-gray-100 font-medium leading-snug line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400">
                          {n.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-gray-400 dark:text-gray-500">{n.publisher}</span>
                          {n.publishedAt && (
                            <span className="text-xs text-gray-300 dark:text-gray-600">· {timeAgo(n.publishedAt)}</span>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

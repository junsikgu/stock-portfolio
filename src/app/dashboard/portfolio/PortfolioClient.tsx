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

const REC_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  STRONG_BUY: { label: '적극매수', bg: 'bg-green-100', text: 'text-green-700' },
  BUY:        { label: '매수',     bg: 'bg-green-50',  text: 'text-green-600' },
  HOLD:       { label: '관망',     bg: 'bg-yellow-50', text: 'text-yellow-700' },
  SELL:       { label: '매도',     bg: 'bg-red-50',    text: 'text-red-600' },
  STRONG_SELL:{ label: '적극매도', bg: 'bg-red-100',   text: 'text-red-700' },
}

interface Props {
  initialHoldings: PortfolioHolding[]
}

function isKrwStock(symbol: string) {
  return symbol.endsWith('.KS') || symbol.endsWith('.KQ') || symbol.endsWith('.KS')
}

export default function PortfolioClient({ initialHoldings }: Props) {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>(initialHoldings)
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({})
  const [analyses, setAnalyses] = useState<Record<string, AiSummary>>({})
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

  // 환율 fetch (USD/KRW)
  useEffect(() => {
    fetch('/api/stocks/quote?symbol=KRW%3DX')
      .then(r => r.json())
      .then(d => { if (d.price && d.price > 100) setUsdKrw(d.price) })
      .catch(() => {})
  }, [])

  // 시세 fetch
  useEffect(() => {
    if (holdings.length === 0) return
    const symbols = [...new Set(holdings.map(h => h.symbol))]
    symbols.forEach(async (symbol) => {
      try {
        const res = await fetch(`/api/stocks/quote?symbol=${symbol}`)
        const data = await res.json()
        setQuotes(prev => ({ ...prev, [symbol]: data }))
      } catch {}
    })
  }, [holdings])

  // AI 분석 자동 fetch
  useEffect(() => {
    if (holdings.length === 0) return
    const symbols = [...new Set(holdings.map(h => h.symbol))]
    symbols.forEach(async (symbol) => {
      try {
        const res = await fetch(`/api/analysis?symbol=${symbol}`)
        const data = await res.json()
        if (data.score != null && data.recommendation) {
          setAnalyses(prev => ({ ...prev, [symbol]: { score: data.score, recommendation: data.recommendation } }))
        }
      } catch {}
    })
  }, [holdings])

  // 가격 포맷 (USD or KRW 환산)
  function fmtAmt(usdAmount: number, isKrw = false): string {
    if (showKRW) {
      const krw = isKrw ? usdAmount : usdAmount * usdKrw
      return '₩' + Math.round(krw).toLocaleString()
    }
    return '$' + usdAmount.toFixed(isKrw ? 0 : 2)
  }

  function fmtPrice(price: number, symbol: string): string {
    const krw = isKrwStock(symbol)
    if (showKRW) {
      const krwVal = krw ? price : price * usdKrw
      return '₩' + Math.round(krwVal).toLocaleString()
    }
    if (krw) return '₩' + Math.round(price).toLocaleString()
    return '$' + price.toFixed(2)
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
      if (selectedSymbol && holdings.find(h => h.id === id)?.symbol === selectedSymbol) {
        setSelectedSymbol(null)
      }
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
    if (!error) {
      setHoldings(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
    }
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
    const pct = ((quote.price - quote.low52) / range) * 100
    return Math.round(pct)
  }

  // 합계 계산 (KRW 모드에서는 원화로 통일)
  const totalCost = holdings.reduce((sum, h) => {
    const krw = isKrwStock(h.symbol)
    const usdVal = krw ? h.avg_price / usdKrw : h.avg_price
    return sum + usdVal * h.quantity
  }, 0)

  const totalCurrentValue = holdings.reduce((sum, h) => {
    const q = quotes[h.symbol]
    const price = q ? q.price : h.avg_price
    const krw = isKrwStock(h.symbol)
    const usdVal = krw ? price / usdKrw : price
    return sum + usdVal * h.quantity
  }, 0)

  const totalPnl = totalCurrentValue - totalCost
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

  const aiScores = holdings.map(h => analyses[h.symbol]?.score).filter((s): s is number => s != null)
  const portfolioScore = aiScores.length > 0 ? Math.round(aiScores.reduce((a, b) => a + b, 0) / aiScores.length) : null

  function fmtTotal(usdVal: number) {
    if (showKRW) return '₩' + Math.round(usdVal * usdKrw).toLocaleString()
    return '$' + usdVal.toFixed(0)
  }

  function getScoreColor(score: number) {
    if (score >= 60) return 'text-green-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  function getScoreBg(score: number) {
    if (score >= 60) return 'bg-green-50 border-green-100'
    if (score >= 40) return 'bg-yellow-50 border-yellow-100'
    return 'bg-red-50 border-red-100'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">내 포트폴리오</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">보유 종목의 수익률을 추적하세요</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 환율 토글 */}
          <button
            onClick={() => setShowKRW(v => !v)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              showKRW
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-400'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
            }`}
            title={showKRW ? `1 USD = ₩${Math.round(usdKrw).toLocaleString()}` : '원화로 보기'}
          >
            {showKRW ? `₩ 원화 (${Math.round(usdKrw).toLocaleString()})` : '$ → ₩'}
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + 종목 추가
          </button>
        </div>
      </div>

      {/* Summary */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">총 평가금액</div>
            <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{fmtTotal(totalCurrentValue)}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">총 투자금액</div>
            <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{fmtTotal(totalCost)}</div>
          </div>
          <div className={`rounded-xl p-4 shadow-sm border ${totalPnl >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
            <div className="text-xs text-gray-500 mb-1">총 손익</div>
            <div className={`text-xl font-bold ${totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalPnl >= 0 ? '+' : ''}{fmtTotal(Math.abs(totalPnl)).replace(/^[₩$]/, (totalPnl >= 0 ? '' : '-') + (showKRW ? '₩' : '$'))}
              <span className="text-sm font-normal ml-1">({totalPnlPct.toFixed(2)}%)</span>
            </div>
          </div>
          <div className={`rounded-xl p-4 shadow-sm border ${portfolioScore != null ? getScoreBg(portfolioScore) : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
            <div className="text-xs text-gray-500 mb-1">포트폴리오 AI 점수</div>
            {portfolioScore != null ? (
              <div className={`text-xl font-bold ${getScoreColor(portfolioScore)}`}>
                {portfolioScore}점
                <span className="text-xs font-normal text-gray-500 ml-1">/ {aiScores.length}종목</span>
              </div>
            ) : (
              <div className="w-20 h-7 bg-gray-100 dark:bg-gray-700 animate-pulse rounded mt-1" />
            )}
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAdd && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200">종목 추가</h3>
          <StockSearch
            onSelect={(r) => setAddForm(prev => ({ ...prev, symbol: r.symbol, name: r.name }))}
            placeholder="종목 검색 (예: 삼성전자, AAPL, Tesla)"
          />
          {addForm.symbol && (
            <div className="text-sm text-blue-600 font-medium">선택됨: {addForm.symbol} - {addForm.name}</div>
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

      {/* Holdings Table */}
      {holdings.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="text-4xl mb-3">💼</div>
          <p className="text-gray-500 dark:text-gray-400">보유 종목이 없습니다. 종목을 추가해보세요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
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

                  // 표시 가격 계산
                  const displayPrice = q ? fmtPrice(q.price, h.symbol) : '-'
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
                        ? (showKRW ? Math.round(pnlData.pnl) : (pnlData.pnl / usdKrw))
                        : (showKRW ? pnlData.pnl * usdKrw : pnlData.pnl))
                    : null
                  const pnlPrefix = showKRW ? '₩' : '$'

                  return (
                    <>
                      <tr
                        key={h.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors ${selectedSymbol === h.symbol ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        onClick={() => !isEditing && setSelectedSymbol(selectedSymbol === h.symbol ? null : h.symbol)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{h.symbol}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-32">{h.name}</div>
                          {h.memo && !isEditing && (
                            <div className="text-xs text-blue-500 truncate max-w-32 mt-0.5">{h.memo}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {recStyle && ai ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{ai.score}</span>
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${recStyle.bg} ${recStyle.text}`}>
                                {recStyle.label}
                              </span>
                            </div>
                          ) : (
                            <div className="w-16 h-4 bg-gray-100 dark:bg-gray-700 animate-pulse rounded" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{displayPrice}</div>
                          {q && (
                            <div className={`text-xs ${q.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {q.changePercent >= 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {w52pct != null ? (
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{w52pct}%</div>
                              <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mt-1 ml-auto">
                                <div
                                  className={`h-1.5 rounded-full ${w52pct >= 70 ? 'bg-red-400' : w52pct >= 40 ? 'bg-green-400' : 'bg-blue-400'}`}
                                  style={{ width: `${w52pct}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300 dark:text-gray-600">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">{h.quantity}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">{displayAvg}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{displayValue}</div>
                          {h.target_price && q && (
                            <div className={`text-xs ${targetPct != null && targetPct > 0 ? 'text-blue-500' : 'text-gray-400'}`}>
                              목표 {targetPct != null ? `${targetPct > 0 ? '+' : ''}${targetPct.toFixed(1)}%` : '-'}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {displayPnl != null && pnlData ? (
                            <div>
                              <div className={`text-sm font-medium ${pnlData.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {pnlData.pnl >= 0 ? '+' : ''}{pnlPrefix}{Math.abs(Math.round(displayPnl)).toLocaleString()}
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
                              className="text-gray-300 hover:text-blue-400 transition-colors text-sm leading-none px-1"
                              title="편집"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(h.id) }}
                              className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                            >
                              ×
                            </button>
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

          {/* Analysis Panel */}
          {selectedSymbol && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-gray-700 dark:text-gray-200">{selectedSymbol}</span> AI 상세 분석
              </p>
              <AnalysisCard symbol={selectedSymbol} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

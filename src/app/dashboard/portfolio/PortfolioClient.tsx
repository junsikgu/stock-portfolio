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

export default function PortfolioClient({ initialHoldings }: Props) {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>(initialHoldings)
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({})
  const [analyses, setAnalyses] = useState<Record<string, AiSummary>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [addForm, setAddForm] = useState({ symbol: '', name: '', quantity: '', avg_price: '' })
  const [adding, setAdding] = useState(false)
  const supabase = createClient()

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

  // AI 분석 자동 fetch (백그라운드)
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

  function calcPnl(holding: PortfolioHolding, quote: StockQuote | undefined) {
    if (!quote) return null
    const currentValue = quote.price * holding.quantity
    const costBasis = holding.avg_price * holding.quantity
    const pnl = currentValue - costBasis
    const pnlPct = (pnl / costBasis) * 100
    return { pnl, pnlPct, currentValue }
  }

  const totalCost = holdings.reduce((sum, h) => sum + h.avg_price * h.quantity, 0)
  const totalCurrentValue = holdings.reduce((sum, h) => {
    const q = quotes[h.symbol]
    return sum + (q ? q.price * h.quantity : h.avg_price * h.quantity)
  }, 0)
  const totalPnl = totalCurrentValue - totalCost
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">내 포트폴리오</h1>
          <p className="text-gray-500 text-sm mt-1">보유 종목의 수익률을 추적하세요</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + 종목 추가
        </button>
      </div>

      {/* Summary */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">총 평가금액</div>
            <div className="text-xl font-bold text-gray-800">${totalCurrentValue.toFixed(0)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">총 투자금액</div>
            <div className="text-xl font-bold text-gray-800">${totalCost.toFixed(0)}</div>
          </div>
          <div className={`rounded-xl p-4 shadow-sm border ${totalPnl >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
            <div className="text-xs text-gray-500 mb-1">총 손익</div>
            <div className={`text-xl font-bold ${totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(0)} ({totalPnlPct.toFixed(2)}%)
            </div>
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAdd && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-semibold text-gray-700">종목 추가</h3>
          <StockSearch
            onSelect={(r) => setAddForm(prev => ({ ...prev, symbol: r.symbol, name: r.name }))}
            placeholder="종목 검색 (예: AAPL, Tesla)"
          />
          {addForm.symbol && (
            <div className="text-sm text-blue-600 font-medium">선택됨: {addForm.symbol} - {addForm.name}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">수량</label>
              <input
                type="number"
                value={addForm.quantity}
                onChange={(e) => setAddForm(prev => ({ ...prev, quantity: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                min="0"
                step="0.001"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">평균매수가 ($)</label>
              <input
                type="number"
                value={addForm.avg_price}
                onChange={(e) => setAddForm(prev => ({ ...prev, avg_price: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                min="0"
                step="0.01"
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
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Holdings Table */}
      {holdings.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <div className="text-4xl mb-3">💼</div>
          <p className="text-gray-500">보유 종목이 없습니다. 종목을 추가해보세요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">종목</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">AI 점수</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">현재가</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">수량</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">평균단가</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">평가금액</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">손익</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {holdings.map((h) => {
                  const q = quotes[h.symbol]
                  const pnlData = calcPnl(h, q)
                  const ai = analyses[h.symbol]
                  const recStyle = ai ? REC_STYLE[ai.recommendation] : null
                  return (
                    <tr
                      key={h.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedSymbol === h.symbol ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedSymbol(selectedSymbol === h.symbol ? null : h.symbol)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800 text-sm">{h.symbol}</div>
                        <div className="text-xs text-gray-400 truncate max-w-32">{h.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        {recStyle && ai ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-gray-700">{ai.score}</span>
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${recStyle.bg} ${recStyle.text}`}>
                              {recStyle.label}
                            </span>
                          </div>
                        ) : (
                          <div className="w-16 h-4 bg-gray-100 animate-pulse rounded" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-medium">{q ? `$${q.price.toFixed(2)}` : '-'}</div>
                        {q && (
                          <div className={`text-xs ${q.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {q.changePercent >= 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">{h.quantity}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">${h.avg_price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {pnlData ? `$${pnlData.currentValue.toFixed(0)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {pnlData ? (
                          <div>
                            <div className={`text-sm font-medium ${pnlData.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {pnlData.pnl >= 0 ? '+' : ''}{pnlData.pnl.toFixed(0)}
                            </div>
                            <div className={`text-xs ${pnlData.pnlPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              ({pnlData.pnlPct >= 0 ? '+' : ''}{pnlData.pnlPct.toFixed(2)}%)
                            </div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(h.id) }}
                          className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Analysis Panel */}
          {selectedSymbol && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-700">{selectedSymbol}</span> AI 상세 분석
              </p>
              <AnalysisCard symbol={selectedSymbol} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

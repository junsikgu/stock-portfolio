'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WatchlistItem } from '@/types'
import StockSearch from '@/components/StockSearch'
import AnalysisCard from '@/components/AnalysisCard'

interface StockQuote {
  price: number
  change: number
  changePercent: number
}

interface Props {
  initialWatchlist: WatchlistItem[]
}

export default function WatchlistClient({ initialWatchlist }: Props) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(initialWatchlist)
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({})
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (watchlist.length === 0) return
    watchlist.forEach(async (item) => {
      try {
        const res = await fetch(`/api/stocks/quote?symbol=${item.symbol}`)
        const data = await res.json()
        setQuotes(prev => ({ ...prev, [item.symbol]: data }))
      } catch {}
    })
  }, [watchlist])

  async function handleAdd(result: { symbol: string; name: string }) {
    if (watchlist.some(w => w.symbol === result.symbol)) return
    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('watchlist')
      .insert({ user_id: user!.id, symbol: result.symbol, name: result.name })
      .select()
      .single()

    if (!error && data) {
      setWatchlist(prev => [data, ...prev])
    }
    setAdding(false)
  }

  async function handleRemove(id: string, symbol: string) {
    const { error } = await supabase.from('watchlist').delete().eq('id', id)
    if (!error) {
      setWatchlist(prev => prev.filter(w => w.id !== id))
      if (selectedSymbol === symbol) setSelectedSymbol(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">관심 종목</h1>
        <p className="text-gray-500 text-sm mt-1">즐겨찾기한 종목을 모니터링하세요</p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <StockSearch
          onSelect={handleAdd}
          placeholder="관심 종목 추가 (예: TSLA, Nvidia)"
        />
        {adding && <p className="text-xs text-gray-400 mt-2">추가 중...</p>}
      </div>

      {watchlist.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <div className="text-4xl mb-3">⭐</div>
          <p className="text-gray-500">관심 종목이 없습니다. 종목을 검색해 추가해보세요!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">종목</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">현재가</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">등락률</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {watchlist.map((item) => {
                  const q = quotes[item.symbol]
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedSymbol === item.symbol ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedSymbol(selectedSymbol === item.symbol ? null : item.symbol)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800 text-sm">{item.symbol}</div>
                        <div className="text-xs text-gray-400 truncate max-w-40">{item.name}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {q ? `$${q.price.toFixed(2)}` : <span className="text-gray-300 text-xs">로딩...</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {q ? (
                          <span className={`text-sm font-medium ${q.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {q.changePercent >= 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemove(item.id, item.symbol) }}
                          className="text-yellow-400 hover:text-gray-400 transition-colors"
                          title="즐겨찾기 해제"
                        >
                          ⭐
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {selectedSymbol && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-700">{selectedSymbol}</span> AI 분석
              </p>
              <AnalysisCard symbol={selectedSymbol} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

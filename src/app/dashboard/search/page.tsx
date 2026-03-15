'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'

interface SearchResult {
  symbol: string
  name: string
  exchange: string
}

interface StockDetail {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  currency: string
  marketCap?: number
  pe?: number
  eps?: number
  high52?: number
  low52?: number
  volume?: number
  avgVolume?: number
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [selectedStock, setSelectedStock] = useState<StockDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [addMsg, setAddMsg] = useState<string | null>(null)
  const [watchMsg, setWatchMsg] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [quantity, setQuantity] = useState('')
  const [avgPrice, setAvgPrice] = useState('')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setSuggestions([]); setSuggestionsOpen(false); return }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setSuggestions(Array.isArray(data) ? data : [])
        setSuggestionsOpen(true)
      } catch {
        setSuggestions([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [])

  async function selectStock(r: SearchResult) {
    setQuery(r.symbol)
    setSuggestionsOpen(false)
    setSuggestions([])
    setLoadingDetail(true)
    setSelectedStock(null)
    setShowAddForm(false)
    setAddMsg(null)
    setWatchMsg(null)
    try {
      const res = await fetch(`/api/stocks/quote?symbol=${r.symbol}`)
      const data = await res.json()
      // API가 symbol을 이름으로 반환하면 검색 결과의 이름 사용 (한국 종목 등)
      const name = (data.name && data.name !== r.symbol) ? data.name : r.name
      setSelectedStock({ ...data, name })
      const currency = data.currency || 'USD'
      setAvgPrice(currency === 'KRW' ? String(Math.round(data.price || 0)) : (data.price?.toFixed(2) || ''))
    } catch {
      setSelectedStock(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  async function handleAddPortfolio() {
    if (!selectedStock || !quantity || !avgPrice) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('portfolio_holdings').insert({
      user_id: user.id,
      symbol: selectedStock.symbol,
      name: selectedStock.name,
      quantity: parseFloat(quantity),
      avg_price: parseFloat(avgPrice),
    })
    setAddMsg(error ? '추가 실패' : '포트폴리오에 추가됐습니다!')
    setShowAddForm(false)
    setQuantity('')
  }

  async function handleAddWatchlist() {
    if (!selectedStock) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('watchlist').insert({
      user_id: user.id,
      symbol: selectedStock.symbol,
      name: selectedStock.name,
    })
    setWatchMsg(error ? (error.code === '23505' ? '이미 관심 종목입니다' : '추가 실패') : '관심 종목에 추가됐습니다!')
  }

  function fmtMktCap(n?: number, currency = 'USD') {
    if (n == null) return '-'
    const sym = currency === 'KRW' ? '₩' : '$'
    if (n >= 1e12) return `${sym}${(n / 1e12).toFixed(2)}T`
    if (n >= 1e9) return `${sym}${(n / 1e9).toFixed(2)}B`
    if (n >= 1e8 && currency === 'KRW') return `${sym}${(n / 1e8).toFixed(0)}억`
    if (n >= 1e6) return `${sym}${(n / 1e6).toFixed(2)}M`
    return `${sym}${n.toFixed(0)}`
  }

  const cur = selectedStock?.currency || 'USD'

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">종목 검색</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">한국어 또는 영문으로 검색하세요</p>
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); fetchSuggestions(e.target.value) }}
          onBlur={() => setTimeout(() => setSuggestionsOpen(false), 200)}
          onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          placeholder="예: 삼성전자, 테슬라, AAPL, Apple..."
        />
        {searching && (
          <div className="absolute right-4 top-3.5 text-gray-400 text-xs">검색 중...</div>
        )}
        {suggestionsOpen && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
            {suggestions.map((r) => (
              <button
                key={r.symbol}
                onMouseDown={() => selectStock(r)}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center justify-between border-b border-gray-50 dark:border-gray-700 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{r.symbol}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-xs ml-2 truncate">{r.name}</span>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded shrink-0 ml-2">{r.exchange}</span>
              </button>
            ))}
          </div>
        )}
        {suggestionsOpen && !searching && suggestions.length === 0 && query.trim() && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
            검색 결과가 없습니다
          </div>
        )}
      </div>

      {loadingDetail && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700 shadow-sm text-gray-400 text-sm">
          불러오는 중...
        </div>
      )}

      {selectedStock && !loadingDetail && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* 가격 헤더 */}
          <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">{selectedStock.symbol}</span>
                  {cur !== 'USD' && (
                    <span className="text-xs bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-medium">{cur}</span>
                  )}
                  <span className={`text-sm font-semibold px-2 py-0.5 rounded ${selectedStock.changePercent >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent?.toFixed(2)}%
                  </span>
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 truncate">{selectedStock.name}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">{formatPrice(selectedStock.price, cur)}</div>
                <div className={`text-sm ${selectedStock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedStock.change >= 0 ? '+' : ''}{formatPrice(Math.abs(selectedStock.change), cur)}
                </div>
              </div>
            </div>
          </div>

          {/* 지표 그리드 */}
          <div className="grid grid-cols-3 gap-px bg-gray-100 dark:bg-gray-700">
            {[
              { label: '시가총액', value: fmtMktCap(selectedStock.marketCap, cur) },
              { label: 'PER', value: selectedStock.pe ? selectedStock.pe.toFixed(2) : '-' },
              { label: 'EPS', value: selectedStock.eps ? formatPrice(selectedStock.eps, cur) : '-' },
              { label: '52주 최고', value: selectedStock.high52 ? formatPrice(selectedStock.high52, cur) : '-' },
              { label: '52주 최저', value: selectedStock.low52 ? formatPrice(selectedStock.low52, cur) : '-' },
              { label: '거래량', value: selectedStock.volume ? (selectedStock.volume >= 1e6 ? (selectedStock.volume / 1e6).toFixed(1) + 'M' : selectedStock.volume.toLocaleString()) : '-' },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-gray-800 px-3 sm:px-4 py-3">
                <div className="text-xs text-gray-400 dark:text-gray-500">{s.label}</div>
                <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 mt-0.5 truncate">{s.value}</div>
              </div>
            ))}
          </div>

          {/* 버튼 영역 */}
          <div className="p-4 space-y-3">
            {addMsg && <div className="text-sm text-green-600 font-medium">{addMsg}</div>}
            {watchMsg && <div className="text-sm text-blue-600 font-medium">{watchMsg}</div>}

            {showAddForm ? (
              <div className="space-y-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200">포트폴리오에 추가</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">수량</label>
                    <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0" min="0" step="0.001" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">평균매수가 ({cur})</label>
                    <input type="number" value={avgPrice} onChange={(e) => setAvgPrice(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0" min="0" step={cur === 'KRW' ? '1' : '0.01'} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddPortfolio} disabled={!quantity || !avgPrice}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-medium">추가</button>
                  <button onClick={() => setShowAddForm(false)}
                    className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium">취소</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setShowAddForm(true)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  + 포트폴리오 추가
                </button>
                <button onClick={handleAddWatchlist}
                  className="flex-1 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  ⭐ 관심 종목 추가
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

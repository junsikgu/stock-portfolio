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
  const [koreanWarning, setKoreanWarning] = useState(false)
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
    if (!q.trim()) { setSuggestions([]); setSuggestionsOpen(false); setKoreanWarning(false); return }

    if (/[\uAC00-\uD7A3\u3131-\u318E]/.test(q)) {
      setKoreanWarning(true); setSuggestions([]); setSuggestionsOpen(false); return
    }
    setKoreanWarning(false)

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
      setSelectedStock(data)
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
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">종목 검색</h1>
        <p className="text-gray-500 text-sm mt-1">종목명 또는 티커를 영문으로 입력하세요</p>
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); fetchSuggestions(e.target.value) }}
          onBlur={() => setTimeout(() => setSuggestionsOpen(false), 200)}
          onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          placeholder="예: AAPL, Tesla, Samsung, Kakao..."
        />
        {searching && (
          <div className="absolute right-4 top-3.5 text-gray-400 text-xs">검색 중...</div>
        )}
        {koreanWarning && (
          <div className="absolute z-50 w-full mt-1 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-xs text-yellow-700">
            한국어 검색은 지원되지 않습니다. 영문으로 입력해주세요<br />
            <span className="font-medium">예) 삼성전자 → Samsung, 카카오 → Kakao, SK하이닉스 → SK Hynix</span>
          </div>
        )}
        {suggestionsOpen && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {suggestions.map((r) => (
              <button
                key={r.symbol}
                onMouseDown={() => selectStock(r)}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center justify-between border-b border-gray-50 last:border-0"
              >
                <div>
                  <span className="font-semibold text-gray-800 text-sm">{r.symbol}</span>
                  <span className="text-gray-500 text-xs ml-2">{r.name}</span>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{r.exchange}</span>
              </button>
            ))}
          </div>
        )}
        {suggestionsOpen && !searching && suggestions.length === 0 && query.trim() && !koreanWarning && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-500">
            검색 결과가 없습니다
          </div>
        )}
      </div>

      {loadingDetail && (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-100 shadow-sm text-gray-400 text-sm">
          불러오는 중...
        </div>
      )}

      {selectedStock && !loadingDetail && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-gray-800">{selectedStock.symbol}</span>
                  {cur !== 'USD' && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">{cur}</span>
                  )}
                  <span className={`text-sm font-semibold px-2 py-0.5 rounded ${selectedStock.changePercent >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent?.toFixed(2)}%
                  </span>
                </div>
                <div className="text-gray-500 text-sm mt-0.5">{selectedStock.name}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800">{formatPrice(selectedStock.price, cur)}</div>
                <div className={`text-sm ${selectedStock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedStock.change >= 0 ? '+' : ''}{formatPrice(Math.abs(selectedStock.change), cur)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-px bg-gray-100">
            {[
              { label: '시가총액', value: fmtMktCap(selectedStock.marketCap, cur) },
              { label: 'PER', value: selectedStock.pe ? selectedStock.pe.toFixed(2) : '-' },
              { label: 'EPS', value: selectedStock.eps ? formatPrice(selectedStock.eps, cur) : '-' },
              { label: '52주 최고', value: selectedStock.high52 ? formatPrice(selectedStock.high52, cur) : '-' },
              { label: '52주 최저', value: selectedStock.low52 ? formatPrice(selectedStock.low52, cur) : '-' },
              { label: '거래량', value: selectedStock.volume ? (selectedStock.volume >= 1e6 ? (selectedStock.volume / 1e6).toFixed(1) + 'M' : selectedStock.volume.toLocaleString()) : '-' },
            ].map((s) => (
              <div key={s.label} className="bg-white px-4 py-3">
                <div className="text-xs text-gray-400">{s.label}</div>
                <div className="text-sm font-semibold text-gray-700 mt-0.5">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="p-4 space-y-3">
            {addMsg && <div className="text-sm text-green-600 font-medium">{addMsg}</div>}
            {watchMsg && <div className="text-sm text-blue-600 font-medium">{watchMsg}</div>}

            {showAddForm ? (
              <div className="space-y-3 bg-gray-50 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-700">포트폴리오에 추가</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">수량</label>
                    <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0" min="0" step="0.001" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">평균매수가 ({cur})</label>
                    <input type="number" value={avgPrice} onChange={(e) => setAvgPrice(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0" min="0" step={cur === 'KRW' ? '1' : '0.01'} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddPortfolio} disabled={!quantity || !avgPrice}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-medium">추가</button>
                  <button onClick={() => setShowAddForm(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium">취소</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setShowAddForm(true)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  + 포트폴리오 추가
                </button>
                <button onClick={handleAddWatchlist}
                  className="flex-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
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

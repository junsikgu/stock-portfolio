'use client'

import { useState, useCallback, useRef } from 'react'

interface SearchResult {
  symbol: string
  name: string
  exchange: string
}

interface Props {
  onSelect: (result: SearchResult) => void
  placeholder?: string
}

export default function StockSearch({ onSelect, placeholder = '종목 검색...' }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [koreanWarning, setKoreanWarning] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setResults([]); setOpen(false); setKoreanWarning(false); return }

    if (/[\uAC00-\uD7A3\u3131-\u318E]/.test(q)) {
      setKoreanWarning(true)
      setResults([])
      setOpen(false)
      return
    }
    setKoreanWarning(false)

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); search(e.target.value) }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onFocus={() => results.length > 0 && setOpen(true)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
      />
      {loading && (
        <div className="absolute right-3 top-3 text-gray-400 text-xs">검색 중...</div>
      )}
      {koreanWarning && (
        <div className="absolute z-50 w-full mt-1 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2.5 text-xs text-yellow-700">
          한국어 검색은 지원되지 않습니다. 영문으로 입력해주세요<br />
          <span className="font-medium">예) 삼성전자 → Samsung, 카카오 → Kakao</span>
        </div>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {results.map((r) => (
            <button
              key={r.symbol}
              onMouseDown={() => {
                onSelect(r)
                setQuery('')
                setOpen(false)
                setResults([])
              }}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center justify-between border-b border-gray-50 last:border-0"
            >
              <div>
                <span className="font-semibold text-gray-800 text-sm">{r.symbol}</span>
                <span className="text-gray-500 text-xs ml-2">{r.name}</span>
              </div>
              <span className="text-xs text-gray-400">{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

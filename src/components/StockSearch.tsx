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
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setResults([]); setOpen(false); return }

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
        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
      />
      {loading && (
        <div className="absolute right-3 top-3 text-gray-400 text-xs">검색 중...</div>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
          {results.map((r) => (
            <button
              key={r.symbol}
              onMouseDown={() => {
                onSelect(r)
                setQuery('')
                setOpen(false)
                setResults([])
              }}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center justify-between border-b border-gray-50 dark:border-gray-700 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{r.symbol}</span>
                <span className="text-gray-500 dark:text-gray-400 text-xs ml-2 truncate">{r.name}</span>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-2">{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

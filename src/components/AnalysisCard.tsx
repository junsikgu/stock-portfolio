'use client'

import { useState, useEffect } from 'react'
import { AnalysisResult, Recommendation } from '@/types'

const recConfig: Record<Recommendation, { label: string; color: string; bg: string }> = {
  STRONG_BUY: { label: '적극매수', color: 'text-green-700', bg: 'bg-green-100' },
  BUY: { label: '매수', color: 'text-green-600', bg: 'bg-green-50' },
  HOLD: { label: '관망', color: 'text-yellow-700', bg: 'bg-yellow-50' },
  SELL: { label: '매도', color: 'text-red-600', bg: 'bg-red-50' },
  STRONG_SELL: { label: '적극매도', color: 'text-red-700', bg: 'bg-red-100' },
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-gray-500 text-right">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-6 text-gray-600">{value}</span>
    </div>
  )
}

interface Props {
  symbol: string
}

export default function AnalysisCard({ symbol }: Props) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    runAnalysis()
  }, [symbol])

  async function runAnalysis() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/analysis?symbol=${symbol}`)
      if (!res.ok) throw new Error('분석 실패')
      const data = await res.json()
      setAnalysis(data)
    } catch {
      setError('분석 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const rec = analysis ? recConfig[analysis.recommendation] : null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200">AI 종합 분석</h3>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
        >
          {loading ? '분석 중...' : '재분석'}
        </button>
      </div>

      {error && (
        <div className="p-4 text-red-500 text-sm">{error}</div>
      )}



      {loading && (
        <div className="p-8 text-center">
          <div className="text-gray-500 dark:text-gray-400 text-sm">분석 중입니다...</div>
          <div className="mt-3 flex justify-center gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {analysis && rec && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-800 dark:text-gray-100">{analysis.score}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">/ 100점</div>
            </div>
            <div className="flex-1">
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${rec.color} ${rec.bg}`}>
                {rec.label}
              </div>
              <div className="mt-2">
                {/* Score bar */}
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      analysis.score >= 60 ? 'bg-green-500' :
                      analysis.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${analysis.score}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <ScoreBar label="기술적" value={analysis.details.technicalScore} />
            <ScoreBar label="애널리스트" value={analysis.details.analystScore} />
            <ScoreBar label="밸류에이션" value={analysis.details.valuationScore} />
            <ScoreBar label="시장심리" value={analysis.details.sentimentScore} />
            <ScoreBar label="거시경제" value={analysis.details.momentumScore} />
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{analysis.reasoning}</p>
          </div>

          {(analysis.analystTargetPrice || analysis.fearGreedIndex || analysis.buffettIndicator) && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {analysis.analystTargetPrice && (
                <div className="bg-blue-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500">목표주가</div>
                  <div className="font-semibold text-blue-700">${analysis.analystTargetPrice.toFixed(0)}</div>
                </div>
              )}
              {analysis.fearGreedIndex !== undefined && (
                <div className="bg-orange-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500">공포탐욕</div>
                  <div className="font-semibold text-orange-700">{analysis.fearGreedIndex}</div>
                </div>
              )}
              {analysis.buffettIndicator !== undefined && (
                <div className="bg-purple-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500">버핏지수</div>
                  <div className="font-semibold text-purple-700">{analysis.buffettIndicator?.toFixed(0)}%</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

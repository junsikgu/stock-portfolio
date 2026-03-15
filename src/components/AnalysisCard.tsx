'use client'

import { useState, useEffect } from 'react'
import { AnalysisResult, Recommendation } from '@/types'

const recConfig: Record<Recommendation, { label: string; color: string; bg: string }> = {
  STRONG_BUY: { label: '적극매수', color: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  BUY:        { label: '매수',     color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  HOLD:       { label: '관망',     color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  SELL:       { label: '매도',     color: 'text-red-600 dark:text-red-400',   bg: 'bg-red-50 dark:bg-red-900/20' },
  STRONG_SELL:{ label: '적극매도', color: 'text-red-700 dark:text-red-400',   bg: 'bg-red-100 dark:bg-red-900/30' },
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-gray-500 dark:text-gray-400 text-right">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-6 text-gray-600 dark:text-gray-300">{value}</span>
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

  // Gemini 심층 분석
  const [geminiText, setGeminiText] = useState('')
  const [geminiLoading, setGeminiLoading] = useState(false)
  const [geminiError, setGeminiError] = useState('')

  useEffect(() => {
    runAnalysis()
  }, [symbol])

  async function runAnalysis() {
    setLoading(true)
    setError('')
    setGeminiText('')
    setGeminiError('')
    try {
      const res = await fetch(`/api/analysis?symbol=${encodeURIComponent(symbol)}`)
      if (!res.ok) throw new Error('분석 실패')
      const data = await res.json()
      setAnalysis(data)
    } catch {
      setError('분석 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }

    // Gemini 분석은 별도로 비동기 호출
    fetchGemini()
  }

  async function fetchGemini() {
    setGeminiLoading(true)
    setGeminiError('')
    try {
      const res = await fetch(`/api/analysis/gemini?symbol=${encodeURIComponent(symbol)}`)
      const data = await res.json()
      if (data.analysis) {
        setGeminiText(data.analysis)
      } else {
        setGeminiError(data.error || 'Gemini 분석 실패')
      }
    } catch {
      setGeminiError('Gemini 연결 오류')
    } finally {
      setGeminiLoading(false)
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

      {error && <div className="p-4 text-red-500 text-sm">{error}</div>}

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
          {/* 점수 + 추천 */}
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
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
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

          {/* 세부 점수 바 */}
          <div className="space-y-1.5">
            <ScoreBar label="기술적" value={analysis.details.technicalScore} />
            <ScoreBar label="애널리스트" value={analysis.details.analystScore} />
            <ScoreBar label="밸류에이션" value={analysis.details.valuationScore} />
            <ScoreBar label="시장심리" value={analysis.details.sentimentScore} />
            <ScoreBar label="거시경제" value={analysis.details.momentumScore} />
          </div>

          {/* 지표 그리드 */}
          {(analysis.analystTargetPrice || analysis.fearGreedIndex || analysis.buffettIndicator) && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {analysis.analystTargetPrice && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">목표주가</div>
                  <div className="font-semibold text-blue-700 dark:text-blue-400">${analysis.analystTargetPrice.toFixed(0)}</div>
                </div>
              )}
              {analysis.fearGreedIndex !== undefined && (
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">공포탐욕</div>
                  <div className="font-semibold text-orange-700 dark:text-orange-400">{analysis.fearGreedIndex}</div>
                </div>
              )}
              {analysis.buffettIndicator !== undefined && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">버핏지수</div>
                  <div className="font-semibold text-purple-700 dark:text-purple-400">{analysis.buffettIndicator?.toFixed(0)}%</div>
                </div>
              )}
            </div>
          )}

          {/* Gemini 심층 분석 */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded">Groq</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">AI 심층 분석</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">llama-3.3-70b</span>
              </div>
              {!geminiLoading && (
                <button
                  onClick={fetchGemini}
                  className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  재생성
                </button>
              )}
            </div>

            {geminiLoading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                  AI가 분석 중입니다...
                </div>
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-3 bg-gray-100 dark:bg-gray-700 animate-pulse rounded ${i === 4 ? 'w-2/3' : 'w-full'}`} />
                ))}
              </div>
            )}

            {geminiError && !geminiLoading && (
              <div className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 break-all">
                {geminiError}
              </div>
            )}

            {geminiText && !geminiLoading && (
              <div className="space-y-3">
                {geminiText.split('\n').filter(p => p.trim()).map((para, i) => {
                  const isConclusion = para.startsWith('종합의견:')
                  const buySignal = isConclusion && para.includes('매수')
                  const sellSignal = isConclusion && para.includes('매도')
                  const holdSignal = isConclusion && para.includes('관망')
                  return (
                    <p key={i} className={
                      isConclusion
                        ? `text-sm font-bold px-3 py-2 rounded-lg ${
                            buySignal  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                            sellSignal ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                            holdSignal ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
                            'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                          }`
                        : 'text-sm text-gray-700 dark:text-gray-300 leading-relaxed'
                    }>
                      {para}
                    </p>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

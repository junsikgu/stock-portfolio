import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'
const yahooFinance = new YahooFinance()

function estimateNextExDate(dividends: any[]): string | null {
  if (dividends.length < 2) return null
  // 최근 지급 간격으로 다음 날짜 추정
  const dates = dividends
    .map(d => new Date(d.date).getTime())
    .sort((a, b) => b - a)
    .slice(0, 5)
  const gaps = dates.slice(0, -1).map((d, i) => d - dates[i + 1])
  const avgGapMs = gaps.reduce((a, b) => a + b, 0) / gaps.length
  const next = new Date(dates[0] + avgGapMs)
  if (next > new Date()) return next.toISOString().split('T')[0]
  return null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 })

  const apiKey = process.env.FINNHUB_API_KEY
  // Finnhub은 US 심볼 기준
  const fhSymbol = symbol.replace(/\.(KS|KQ)$/i, '')

  let annualDivPerShare: number | null = null
  let dividendYield: number | null = null
  let nextExDate: string | null = null

  // ── 1. Finnhub ──────────────────────────────────────────────
  if (apiKey) {
    try {
      const [metricRes, divRes] = await Promise.allSettled([
        fetch(
          `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(fhSymbol)}&metric=all&token=${apiKey}`,
          { next: { revalidate: 3600 } }
        ).then(r => r.json()),
        fetch(
          (() => {
            const to = new Date()
            const from = new Date(); from.setFullYear(from.getFullYear() - 2)
            return `https://finnhub.io/api/v1/stock/dividend?symbol=${encodeURIComponent(fhSymbol)}&from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}&token=${apiKey}`
          })(),
          { next: { revalidate: 3600 } }
        ).then(r => r.json()),
      ])

      if (metricRes.status === 'fulfilled') {
        const m = metricRes.value?.metric
        if (m?.dividendPerShareAnnual > 0) annualDivPerShare = m.dividendPerShareAnnual
        if (m?.dividendYieldIndicatedAnnual > 0) dividendYield = m.dividendYieldIndicatedAnnual
      }

      if (divRes.status === 'fulfilled' && Array.isArray(divRes.value) && divRes.value.length > 0) {
        const sorted = [...divRes.value].sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        // payDate가 미래이면 다음 지급일로 사용
        const futurePayDate = sorted.find(d => d.payDate && new Date(d.payDate) > new Date())
        nextExDate = futurePayDate?.date ?? estimateNextExDate(sorted)
      }
    } catch {}
  }

  // ── 2. Yahoo Finance 폴백 ────────────────────────────────────
  if (!annualDivPerShare || !dividendYield) {
    try {
      const summary = await yahooFinance.quoteSummary(
        symbol.toUpperCase(),
        { modules: ['summaryDetail'] as any },
        { validateResult: false }
      ) as any
      const sd = summary?.summaryDetail
      if (!annualDivPerShare && sd?.dividendRate > 0) annualDivPerShare = sd.dividendRate
      if (!dividendYield && sd?.dividendYield > 0) dividendYield = sd.dividendYield * 100
      if (!nextExDate && sd?.exDividendDate) {
        const d = new Date(sd.exDividendDate)
        if (!isNaN(d.getTime())) nextExDate = d.toISOString().split('T')[0]
      }
    } catch {}
  }

  const hasDividend = (annualDivPerShare ?? 0) > 0

  return NextResponse.json({
    annualDivPerShare: hasDividend ? annualDivPerShare : null,
    dividendYield: hasDividend ? dividendYield : null,
    nextExDate: hasDividend ? nextExDate : null,
    hasDividend,
  })
}

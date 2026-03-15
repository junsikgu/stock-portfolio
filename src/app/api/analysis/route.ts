import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'
const yahooFinance = new YahooFinance()
import { analyzeStock } from '@/lib/analysis/scoring'

async function getAnalystData(symbol: string) {
  try {
    const summary = await yahooFinance.quoteSummary(
      symbol,
      { modules: ['recommendationTrend', 'financialData'] as any },
      { validateResult: false }
    ) as any

    const trend = summary?.recommendationTrend?.trend?.[0] // 가장 최근 월
    const financial = summary?.financialData

    return {
      targetPrice: financial?.targetMeanPrice ?? null,
      strongBuy: trend?.strongBuy ?? 0,
      buy: trend?.buy ?? 0,
      hold: trend?.hold ?? 0,
      sell: trend?.sell ?? 0,
      strongSell: trend?.strongSell ?? 0,
    }
  } catch {
    return null
  }
}

async function getFearGreedIndex(): Promise<number | undefined> {
  try {
    const res = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)',
        'Referer': 'https://www.cnn.com/markets/fear-and-greed',
      },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return undefined
    const data = await res.json()
    const score = data?.fear_and_greed?.score
    return typeof score === 'number' ? Math.round(score) : undefined
  } catch {
    return undefined
  }
}

async function getBuffettIndicator(): Promise<number | undefined> {
  const apiKey = process.env.FRED_API_KEY
  if (!apiKey) return undefined

  try {
    // NCBEILQ027S: 비금융기업 시총 (백만달러), GDP: 십억달러
    const [marketCapRes, gdpRes] = await Promise.all([
      fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=NCBEILQ027S&api_key=${apiKey}&sort_order=desc&limit=1&file_type=json`),
      fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key=${apiKey}&sort_order=desc&limit=1&file_type=json`),
    ])

    const marketCapData = await marketCapRes.json()
    const gdpData = await gdpRes.json()

    const marketCapMillions = parseFloat(marketCapData?.observations?.[0]?.value)
    const gdpBillions = parseFloat(gdpData?.observations?.[0]?.value)

    if (isNaN(marketCapMillions) || isNaN(gdpBillions) || gdpBillions === 0) return undefined

    return Math.round((marketCapMillions / (gdpBillions * 1000)) * 100)
  } catch {
    return undefined
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }

  try {
    const [quoteResult, analyst, fearGreed, buffett] = await Promise.all([
      yahooFinance.quote(symbol.toUpperCase(), {}, { validateResult: false }) as Promise<any>,
      getAnalystData(symbol.toUpperCase()),
      getFearGreedIndex(),
      getBuffettIndicator(),
    ])

    const quote = quoteResult as any

    const result = analyzeStock({
      symbol: symbol.toUpperCase(),
      currentPrice: quote.regularMarketPrice || 0,
      previousClose: quote.regularMarketPreviousClose || 0,
      high52: quote.fiftyTwoWeekHigh || 0,
      low52: quote.fiftyTwoWeekLow || 0,
      pe: quote.trailingPE,
      eps: quote.epsTrailingTwelveMonths,
      volume: quote.regularMarketVolume || 0,
      avgVolume: quote.averageDailyVolume3Month || 0,
      analystTargetPrice: analyst?.targetPrice || undefined,
      strongBuy: analyst?.strongBuy,
      buy: analyst?.buy,
      hold: analyst?.hold,
      sell: analyst?.sell,
      strongSell: analyst?.strongSell,
      fearGreedIndex: fearGreed,
      buffettIndicator: buffett,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: 'Failed to analyze stock' }, { status: 500 })
  }
}

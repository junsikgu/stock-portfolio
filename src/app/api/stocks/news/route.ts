import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'
const yahooFinance = new YahooFinance()

async function fetchFinnhub(symbol: string): Promise<any[]> {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) return []

  // Finnhub은 US 심볼 기준 — 한국 종목 접미사 제거
  const fhSymbol = symbol.replace(/\.(KS|KQ)$/i, '')

  const to = new Date()
  const toStr = to.toISOString().split('T')[0]

  async function tryFetch(daysBack: number) {
    const from = new Date()
    from.setDate(to.getDate() - daysBack)
    const fromStr = from.toISOString().split('T')[0]
    const res = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(fhSymbol)}&from=${fromStr}&to=${toStr}&token=${apiKey}`,
      { next: { revalidate: 1800 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  }

  let articles = await tryFetch(14)
  if (articles.length === 0) articles = await tryFetch(90)

  return articles.slice(0, 3).map((n: any) => ({
    title: n.headline,
    link: n.url,
    publisher: n.source,
    publishedAt: n.datetime, // unix seconds
  }))
}

async function fetchYahoo(symbol: string): Promise<any[]> {
  try {
    const result = await yahooFinance.search(
      symbol,
      { quotesCount: 0, newsCount: 3 },
      { validateResult: false }
    ) as any
    return ((result?.news) || []).slice(0, 3).map((n: any) => ({
      title: n.title,
      link: n.link,
      publisher: n.publisher,
      publishedAt: n.providerPublishTime,
    }))
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  if (!symbol) return NextResponse.json([])

  // 1순위: Finnhub
  const finnhubNews = await fetchFinnhub(symbol).catch(() => [])
  if (finnhubNews.length > 0) return NextResponse.json(finnhubNews)

  // 2순위: Yahoo Finance 폴백
  const yahooNews = await fetchYahoo(symbol)
  return NextResponse.json(yahooNews)
}

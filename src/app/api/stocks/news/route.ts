import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  if (!symbol) return NextResponse.json([])

  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) return NextResponse.json([])

  // Finnhub은 US 심볼 기준 — 한국 종목 접미사 제거
  const fhSymbol = symbol.replace(/\.(KS|KQ)$/i, '')

  const to = new Date()
  const toStr = to.toISOString().split('T')[0]

  async function fetchNews(daysBack: number) {
    const from = new Date()
    from.setDate(to.getDate() - daysBack)
    const fromStr = from.toISOString().split('T')[0]
    const res = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(fhSymbol)}&from=${fromStr}&to=${toStr}&token=${apiKey}`,
      { next: { revalidate: 1800 } }
    )
    return res.json()
  }

  try {
    let articles = await fetchNews(14)
    if (!Array.isArray(articles) || articles.length === 0) {
      articles = await fetchNews(90)
    }

    const news = (Array.isArray(articles) ? articles : [])
      .slice(0, 3)
      .map((n: any) => ({
        title: n.headline,
        link: n.url,
        publisher: n.source,
        publishedAt: n.datetime, // unix seconds
        summary: n.summary,
      }))

    return NextResponse.json(news)
  } catch {
    return NextResponse.json([])
  }
}

import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'
const yahooFinance = new YahooFinance()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  if (!symbol) return NextResponse.json([])

  try {
    const result = await yahooFinance.search(
      symbol,
      { quotesCount: 0, newsCount: 3 },
      { validateResult: false }
    ) as any
    const news = ((result as any).news || []).slice(0, 3).map((n: any) => ({
      title: n.title,
      link: n.link,
      publisher: n.publisher,
      publishedAt: n.providerPublishTime,
    }))
    return NextResponse.json(news)
  } catch {
    return NextResponse.json([])
  }
}

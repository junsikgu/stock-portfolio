import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'
import { searchKorean } from '@/lib/korean-stocks'
const yahooFinance = new YahooFinance()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 })
  }

  // 한국어 입력 → 사전 검색
  if (/[\uAC00-\uD7A3\u3131-\u318E]/.test(query)) {
    const results = searchKorean(query)
    return NextResponse.json(results)
  }

  try {
    const results = await yahooFinance.search(query, {}, { validateResult: false }) as any
    const stocks = (results.quotes || [])
      .filter((q: any) => ['EQUITY', 'ETF', 'MUTUALFUND'].includes(q.quoteType) && q.exchange)
      .slice(0, 8)
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        exchange: q.exchDisp || q.exchange,
      }))
    return NextResponse.json(stocks)
  } catch (error) {
    console.error('Yahoo Finance search error:', error)
    return NextResponse.json([], { status: 200 })
  }
}

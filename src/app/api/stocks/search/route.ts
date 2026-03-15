import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'
const yahooFinance = new YahooFinance()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 })
  }

  // 한국어 입력 감지
  if (/[\uAC00-\uD7A3\u3131-\u318E]/.test(query)) {
    return NextResponse.json({ error: '영문으로 검색해주세요 (예: Samsung → 삼성전자)' }, { status: 400 })
  }

  try {
    const results = await yahooFinance.search(query, {}, { validateResult: false }) as any
    const stocks = (results.quotes || [])
      .filter((q: any) => q.quoteType === 'EQUITY' && q.exchange)
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

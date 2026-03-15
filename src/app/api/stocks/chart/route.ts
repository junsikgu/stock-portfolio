import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'
const yahooFinance = new YahooFinance()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  const period = searchParams.get('period') || '1m'

  if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 })

  const now = new Date()
  const from = new Date()
  if (period === '1w') from.setDate(now.getDate() - 8)
  else if (period === '3m') from.setMonth(now.getMonth() - 3)
  else from.setMonth(now.getMonth() - 1)

  try {
    const result = await yahooFinance.chart(
      symbol.toUpperCase(),
      { period1: from, period2: now, interval: '1d' },
      { validateResult: false }
    ) as any

    const quotes: any[] = result?.quotes || []
    const data = quotes
      .filter(q => q?.close != null)
      .map(q => ({
        date: new Date(q.date).toISOString().split('T')[0],
        close: parseFloat(q.close.toFixed(2)),
      }))

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch chart' }, { status: 500 })
  }
}

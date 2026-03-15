import { NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] } as any)

async function getFearGreedIndex() {
  try {
    const res = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)',
        'Referer': 'https://www.cnn.com/markets/fear-and-greed',
      },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return { score: null, label: null }
    const data = await res.json()
    const score = data?.fear_and_greed?.score
    const rating = data?.fear_and_greed?.rating
    return { score: typeof score === 'number' ? Math.round(score) : null, label: rating }
  } catch {
    return { score: null, label: null }
  }
}

async function getBuffettIndicator() {
  const apiKey = process.env.FRED_API_KEY
  if (!apiKey) return null

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

    if (isNaN(marketCapMillions) || isNaN(gdpBillions) || gdpBillions === 0) return null
    return Math.round((marketCapMillions / (gdpBillions * 1000)) * 100)
  } catch {
    return null
  }
}

async function getFredSeries(apiKey: string, seriesId: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&sort_order=desc&limit=1&file_type=json`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    const val = parseFloat(data?.observations?.[0]?.value)
    return isNaN(val) ? null : val
  } catch {
    return null
  }
}

async function getCpiYoy(apiKey: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key=${apiKey}&sort_order=desc&limit=13&file_type=json`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    const obs = data?.observations
    if (!obs || obs.length < 13) return null
    const latest = parseFloat(obs[0].value)
    const yearAgo = parseFloat(obs[12].value)
    if (isNaN(latest) || isNaN(yearAgo) || yearAgo === 0) return null
    return Math.round(((latest - yearAgo) / yearAgo) * 1000) / 10
  } catch {
    return null
  }
}

async function getYahooQuotes() {
  try {
    const symbols = ['^VIX', 'GC=F', 'CL=F', 'DX-Y.NYB']
    const results = await Promise.all(
      symbols.map(s => yahooFinance.quote(s, {}, { validateResult: false } as any).catch(() => null))
    ) as any[]
    return {
      vix: results[0]?.regularMarketPrice ?? null,
      gold: results[1]?.regularMarketPrice ?? null,
      oil: results[2]?.regularMarketPrice ?? null,
      dxy: results[3]?.regularMarketPrice ?? null,
    }
  } catch {
    return { vix: null, gold: null, oil: null, dxy: null }
  }
}

export async function GET() {
  const fredKey = process.env.FRED_API_KEY

  const [fearGreed, buffett, yahooData, treasury10y, fedFunds, unemployment, cpiYoy] = await Promise.all([
    getFearGreedIndex(),
    getBuffettIndicator(),
    getYahooQuotes(),
    fredKey ? getFredSeries(fredKey, 'DGS10') : Promise.resolve(null),
    fredKey ? getFredSeries(fredKey, 'FEDFUNDS') : Promise.resolve(null),
    fredKey ? getFredSeries(fredKey, 'UNRATE') : Promise.resolve(null),
    fredKey ? getCpiYoy(fredKey) : Promise.resolve(null),
  ])

  return NextResponse.json({
    fearGreedIndex: fearGreed.score,
    fearGreedLabel: fearGreed.label,
    buffettIndicator: buffett,
    vix: yahooData.vix,
    gold: yahooData.gold,
    oil: yahooData.oil,
    dxy: yahooData.dxy,
    treasury10y,
    fedFunds,
    unemployment,
    cpiYoy,
  })
}

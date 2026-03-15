import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'
const yahooFinance = new YahooFinance()

async function getAnalystData(symbol: string) {
  try {
    const summary = await yahooFinance.quoteSummary(
      symbol,
      { modules: ['recommendationTrend', 'financialData'] as any },
      { validateResult: false }
    ) as any
    const trend = summary?.recommendationTrend?.trend?.[0]
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

async function getFearGreed(): Promise<number | undefined> {
  try {
    const res = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.cnn.com/markets/fear-and-greed' },
      next: { revalidate: 3600 },
    })
    const data = await res.json()
    const score = data?.fear_and_greed?.score
    return typeof score === 'number' ? Math.round(score) : undefined
  } catch { return undefined }
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
  }

  const symbol = request.nextUrl.searchParams.get('symbol')
  if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 })

  try {
    const [quote, analyst, fearGreed] = await Promise.all([
      yahooFinance.quote(symbol.toUpperCase(), {}, { validateResult: false }) as Promise<any>,
      getAnalystData(symbol.toUpperCase()),
      getFearGreed(),
    ])

    const price = quote.regularMarketPrice ?? 0
    const high52 = quote.fiftyTwoWeekHigh ?? 0
    const low52 = quote.fiftyTwoWeekLow ?? 0
    const range = high52 - low52
    const position52 = range > 0 ? Math.round(((price - low52) / range) * 100) : null
    const pe = quote.trailingPE ?? null
    const name = quote.longName || quote.shortName || symbol
    const currency = quote.currency === 'KRW' ? '₩' : '$'

    const totalAnalysts = analyst
      ? (analyst.strongBuy + analyst.buy + analyst.hold + analyst.sell + analyst.strongSell)
      : 0

    const upside = analyst?.targetPrice && price > 0
      ? (((analyst.targetPrice - price) / price) * 100).toFixed(1)
      : null

    const fearLabel = fearGreed == null ? '데이터 없음'
      : fearGreed < 25 ? `${fearGreed} (극공포)`
      : fearGreed < 45 ? `${fearGreed} (공포)`
      : fearGreed < 55 ? `${fearGreed} (중립)`
      : fearGreed < 75 ? `${fearGreed} (탐욕)`
      : `${fearGreed} (극탐욕)`

    const prompt = `You are a professional stock investment analyst. Write the analysis ENTIRELY IN KOREAN (한국어). Do NOT use any Japanese, Chinese, or English words in your response. Every single sentence must be in Korean only.

아래 지표를 바탕으로 ${name} (${symbol}) 종목에 대한 투자 분석을 작성하세요.

종목 지표:
- 현재가: ${currency}${price.toLocaleString()}
- 52주 고점: ${currency}${high52.toLocaleString()} / 저점: ${currency}${low52.toLocaleString()}${position52 != null ? ` → 현재 52주 범위의 ${position52}% 위치` : ''}
${analyst && totalAnalysts > 0 ? `- 애널리스트 의견 (${totalAnalysts}명): 적극매수 ${analyst.strongBuy}명, 매수 ${analyst.buy}명, 보유 ${analyst.hold}명, 매도 ${analyst.sell}명, 적극매도 ${analyst.strongSell}명` : ''}
${analyst?.targetPrice ? `- 목표주가: ${currency}${Number(analyst.targetPrice).toLocaleString()}${upside ? ` (현재가 대비 ${Number(upside) > 0 ? '+' : ''}${upside}%)` : ''}` : ''}
${pe ? `- PER: ${pe.toFixed(1)}배` : ''}
- 공포탐욕지수: ${fearLabel}

작성 요령:
1. 첫 문단: 52주 가격 위치와 기술적 흐름에 대한 평가
2. 둘째 문단: 애널리스트 컨센서스와 목표주가를 근거로 한 기대 수익성 판단
3. 셋째 문단: 공포탐욕지수 등 매크로 심리 환경을 고려한 리스크와 투자 결론

투자자가 실제로 참고할 수 있도록 구체적이고 명확하게 작성하고, 각 문단은 3~5문장으로 구성해주세요. 마크다운 기호는 사용하지 마세요.`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800,
      }),
    })

    const groqData = await groqRes.json()
    if (!groqRes.ok) {
      const msg = groqData?.error?.message || JSON.stringify(groqData?.error) || 'Groq API 오류'
      throw new Error(`[${groqRes.status}] ${msg}`)
    }

    const text: string = groqData.choices?.[0]?.message?.content || ''
    return NextResponse.json({ analysis: text, symbol: symbol.toUpperCase() })
  } catch (error: any) {
    console.error('Groq analysis error:', error)
    return NextResponse.json({ error: 'AI 분석 실패: ' + (error?.message || '') }, { status: 500 })
  }
}

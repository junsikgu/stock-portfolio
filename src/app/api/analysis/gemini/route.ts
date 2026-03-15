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

    const fearLabel = fearGreed == null ? null
      : fearGreed < 25 ? `${fearGreed} (극공포)`
      : fearGreed < 45 ? `${fearGreed} (공포)`
      : fearGreed < 55 ? `${fearGreed} (중립)`
      : fearGreed < 75 ? `${fearGreed} (탐욕)`
      : `${fearGreed} (극탐욕)`

    // 매수 비율 계산
    const buyRatio = totalAnalysts > 0
      ? Math.round(((analyst!.strongBuy + analyst!.buy) / totalAnalysts) * 100)
      : null
    const upsideNum = upside != null ? Number(upside) : null

    const lines = [
      `- 현재가: ${currency}${price.toLocaleString()}`,
      `- 52주 고점: ${currency}${high52.toLocaleString()} / 저점: ${currency}${low52.toLocaleString()}${position52 != null ? ` → 현재 52주 범위의 ${position52}% 위치` : ''}`,
      analyst && totalAnalysts > 0 ? `- 애널리스트 의견 (${totalAnalysts}명): 적극매수 ${analyst.strongBuy}명, 매수 ${analyst.buy}명, 보유 ${analyst.hold}명, 매도 ${analyst.sell}명, 적극매도 ${analyst.strongSell}명${buyRatio != null ? ` (매수 의견 비율 ${buyRatio}%)` : ''}` : null,
      analyst?.targetPrice ? `- 목표주가: ${currency}${Number(analyst.targetPrice).toLocaleString()}${upside ? ` (현재가 대비 ${upsideNum! > 0 ? '+' : ''}${upside}% 상승여력)` : ''}` : null,
      pe ? `- PER: ${pe.toFixed(1)}배` : null,
      fearLabel ? `- 공포탐욕지수: ${fearLabel}` : null,
    ].filter(Boolean).join('\n')

    const prompt = `${name} (${symbol}) 투자 분석을 아래 지표 기반으로 작성하세요.

[지표]
${lines}

[판단 기준 — 반드시 준수]
- 목표주가 상승여력 10% 미만이면 매수 추천 금지, 관망 또는 매도로 판단
- 애널리스트 매수 의견 비율 50% 미만이면 관망 또는 매도로 판단
- 52주 고점 대비 현재가가 90% 이상이면 과매수 위험 언급
- 공포탐욕지수 없으면 PER·52주 위치로 시장 심리를 대신 해석
- 긍정적 근거와 부정적 근거를 반드시 함께 제시할 것 (일방적 낙관 금지)

[작성 규칙]
- 전체 3개 문단, 각 문단 3줄 이내, 핵심만 간결하게
- 반복 표현 금지, 마크다운 기호 사용 금지
- 마지막 줄은 반드시: 종합의견: [매수 / 관망 / 매도 중 하나]

[문단 구성]
1문단: 52주 가격 위치 기반 기술적 평가 (긍정·부정 모두 포함)
2문단: 애널리스트 컨센서스·목표주가 상승여력 기반 수익성 판단
3문단: 리스크 요인과 최종 투자 결론 + 종합의견`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: '당신은 한국어 전용 주식 투자 분석가입니다. 반드시 한국어(한글)만 사용하세요. 한자(漢字), 일본어(日本語), 중국어(中文) 등 한글이 아닌 문자는 절대 사용하지 마세요. 모든 문장을 순수한 한국어로만 작성하세요.',
          },
          { role: 'user', content: prompt },
        ],
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

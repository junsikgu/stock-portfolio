import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'
const yahooFinance = new YahooFinance()

async function getMarketIndicators() {
  const [vixRes, fgRes] = await Promise.allSettled([
    yahooFinance.quote('^VIX', {}, { validateResult: false }) as Promise<any>,
    fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.cnn.com/markets/fear-and-greed' },
      next: { revalidate: 3600 },
    }).then(r => r.json()),
  ])

  const vix = vixRes.status === 'fulfilled' ? (vixRes.value?.regularMarketPrice ?? null) : null
  const fg = fgRes.status === 'fulfilled' ? (fgRes.value?.fear_and_greed?.score ?? null) : null

  return { vix, fearGreed: typeof fg === 'number' ? Math.round(fg) : null }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })

  const body = await request.json()
  const { holdings, quotes, analyses } = body as {
    holdings: { symbol: string; name: string; quantity: number; avg_price: number }[]
    quotes: Record<string, { price: number; changePercent: number }>
    analyses: Record<string, { score: number; recommendation: string }>
  }

  if (!holdings?.length) return NextResponse.json({ error: 'holdings required' }, { status: 400 })

  const { vix, fearGreed } = await getMarketIndicators()

  // 종목별 요약 라인 생성
  const holdingLines = holdings.map(h => {
    const q = quotes[h.symbol]
    const ai = analyses[h.symbol]
    const pnlPct = q ? (((q.price - h.avg_price) / h.avg_price) * 100).toFixed(1) : null
    const recLabels: Record<string, string> = {
      STRONG_BUY: '적극매수', BUY: '매수', HOLD: '관망', SELL: '매도', STRONG_SELL: '적극매도',
    }
    return [
      `${h.symbol} (${h.name})`,
      q ? `현재가 $${q.price.toFixed(2)}, 등락 ${q.changePercent >= 0 ? '+' : ''}${q.changePercent?.toFixed(1)}%` : '',
      pnlPct ? `수익률 ${Number(pnlPct) >= 0 ? '+' : ''}${pnlPct}%` : '',
      ai ? `AI점수 ${ai.score}점 (${recLabels[ai.recommendation] || ai.recommendation})` : '',
    ].filter(Boolean).join(', ')
  }).join('\n')

  const marketLines = [
    vix != null ? `VIX(변동성지수): ${vix.toFixed(1)}${vix >= 30 ? ' (극심한 공포)' : vix >= 20 ? ' (불안)' : ' (안정)'}` : null,
    fearGreed != null ? `공포탐욕지수: ${fearGreed}${fearGreed < 25 ? ' (극공포)' : fearGreed < 45 ? ' (공포)' : fearGreed < 55 ? ' (중립)' : fearGreed < 75 ? ' (탐욕)' : ' (극탐욕)'}` : null,
  ].filter(Boolean).join('\n')

  const vixWarn  = vix != null && vix >= 25
  const highVix  = vix != null && vix >= 30

  const prompt = `아래 포트폴리오 전체 데이터를 분석하여 한국어로 작성하세요.

[보유 종목]
${holdingLines}

${marketLines ? `[시장 지표]\n${marketLines}` : ''}

[판단 기준 — 반드시 준수]
- 매도·관망 종목이 전체의 절반 이상이면 포트폴리오 전체를 보수적으로 판단
${vixWarn ? `- VIX ${vix?.toFixed(1)} → ${highVix ? '극심한 변동성, 신규 매수 자제 권고' : '시장 불안, 보수적 판단 적용'}` : ''}
- 섹터가 한두 곳에 집중되어 있으면 분산 부족 리스크를 반드시 언급
- 수익률이 마이너스인 종목이 있으면 손실 현황을 구체적으로 언급
- 긍정적 근거와 부정적 근거를 반드시 함께 제시할 것 (일방적 낙관 금지)

[작성 규칙]
- 전체 2~3문장, 핵심만 간결하게
- 섹터 분산도, 리스크, 전체 포트폴리오 방향성 포함
- 반복 표현·중복 내용·마크다운 기호 금지
- 마지막 줄은 반드시: 종합의견: [매수 / 관망 / 매도 중 하나]`

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: '당신은 한국어 전용 포트폴리오 분석가입니다. 반드시 순수한 한국어(한글)만 사용하세요. 한자·일본어·중국어는 절대 사용하지 마세요.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 400,
    }),
  })

  const groqData = await groqRes.json()
  if (!groqRes.ok) {
    const msg = groqData?.error?.message || 'Groq API 오류'
    return NextResponse.json({ error: `[${groqRes.status}] ${msg}` }, { status: groqRes.status })
  }

  const text: string = groqData.choices?.[0]?.message?.content || ''
  return NextResponse.json({ analysis: text, vix, fearGreed })
}

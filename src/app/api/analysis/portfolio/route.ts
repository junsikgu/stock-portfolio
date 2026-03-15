import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'
const yahooFinance = new YahooFinance()

async function getMarketIndicators() {
  const fredKey = process.env.FRED_API_KEY

  const [vixRes, fgRes, mcRes, gdpRes] = await Promise.allSettled([
    yahooFinance.quote('^VIX', {}, { validateResult: false }) as Promise<any>,
    fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.cnn.com/markets/fear-and-greed' },
      next: { revalidate: 3600 },
    }).then(r => r.json()),
    fredKey ? fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=NCBEILQ027S&api_key=${fredKey}&sort_order=desc&limit=1&file_type=json`).then(r => r.json()) : Promise.reject(),
    fredKey ? fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key=${fredKey}&sort_order=desc&limit=1&file_type=json`).then(r => r.json()) : Promise.reject(),
  ])

  const vix = vixRes.status === 'fulfilled' ? (vixRes.value?.regularMarketPrice ?? null) : null
  const fg  = fgRes.status  === 'fulfilled' ? (fgRes.value?.fear_and_greed?.score ?? null) : null

  let buffett: number | null = null
  if (mcRes.status === 'fulfilled' && gdpRes.status === 'fulfilled') {
    const mc  = parseFloat(mcRes.value?.observations?.[0]?.value)
    const gdp = parseFloat(gdpRes.value?.observations?.[0]?.value)
    if (!isNaN(mc) && !isNaN(gdp) && gdp > 0) buffett = Math.round((mc / (gdp * 1000)) * 100)
  }

  return {
    vix,
    fearGreed: typeof fg === 'number' ? Math.round(fg) : null,
    buffett,
  }
}

const recLabels: Record<string, string> = {
  STRONG_BUY: '적극매수', BUY: '매수', HOLD: '관망', SELL: '매도', STRONG_SELL: '적극매도',
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

  const { vix, fearGreed, buffett } = await getMarketIndicators()

  // 종목별 상세 라인
  const holdingLines = holdings.map(h => {
    const q = quotes[h.symbol]
    const ai = analyses[h.symbol]
    const pnlPct = q ? (((q.price - h.avg_price) / h.avg_price) * 100).toFixed(1) : null
    return `• ${h.symbol} (${h.name}): 현재가 ${q ? `$${q.price.toFixed(2)}` : '정보없음'}, 수익률 ${pnlPct != null ? `${Number(pnlPct) >= 0 ? '+' : ''}${pnlPct}%` : '-'}, AI점수 ${ai ? `${ai.score}점 (${recLabels[ai.recommendation] || ai.recommendation})` : '분석중'}`
  }).join('\n')

  // 시장 지표 (수치 포함)
  const vixLabel    = vix      != null ? `VIX ${vix.toFixed(1)}${vix >= 30 ? ' (극심한 공포 구간)' : vix >= 25 ? ' (높은 변동성 주의)' : vix >= 20 ? ' (불안 구간)' : ' (안정 구간)'}` : null
  const fgLabel     = fearGreed != null ? `공포탐욕지수 ${fearGreed}${fearGreed < 25 ? ' (극공포)' : fearGreed < 45 ? ' (공포)' : fearGreed < 55 ? ' (중립)' : fearGreed < 75 ? ' (탐욕)' : ' (극탐욕)'}` : null
  const buffLabel   = buffett   != null ? `버핏지수 ${buffett}%${buffett >= 200 ? ' (역사적 고평가, 시장 버블 위험)' : buffett >= 150 ? ' (상당히 고평가)' : buffett >= 100 ? ' (보통)' : ' (저평가 구간)'}` : null
  const marketLines = [vixLabel, fgLabel, buffLabel].filter(Boolean).join('\n')

  // 시장 상황 요약 (프롬프트 판단 힌트)
  const badMarket = (vix != null && vix >= 25) || (fearGreed != null && fearGreed < 35) || (buffett != null && buffett >= 180)
  const sellCount = holdings.filter(h => ['SELL', 'STRONG_SELL'].includes(analyses[h.symbol]?.recommendation)).length
  const majorityNegative = sellCount >= Math.ceil(holdings.length / 2)

  const prompt = `다음 포트폴리오를 분석하여 한국어로 투자 의견을 작성하세요.

[보유 종목 현황]
${holdingLines}

[시장 지표]
${marketLines || '시장 지표 데이터 없음'}

[판단 기준 — 반드시 준수]
1. 각 종목 이름(심볼)을 직접 언급하며 설명할 것
2. VIX, 버핏지수, 공포탐욕지수 수치를 직접 인용할 것 (있는 경우)
3. 섹터 편중(예: 기술주 집중)이 있으면 구체적 리스크(금리 민감도, 밸류에이션 부담 등) 명시
4. 손실 종목은 구체적으로 언급하고 대응 방향 제시
5. 긍정·부정 근거 반드시 동시에 제시, 일방적 낙관 금지
${badMarket ? '6. 현재 시장 지표상 위험 구간 — 신규 추가매수 추천 금지, 리스크 관리 중심으로 작성' : ''}
${majorityNegative ? '7. 보유 종목 과반이 매도/관망 — 포트폴리오 전체를 보수적으로 판단' : ''}
${buffett != null && buffett >= 200 ? `8. 버핏지수 ${buffett}% — 시장 전반 고평가 상태 반드시 언급` : ''}

[작성 형식]
- 최소 4~5문장 이상
- 마지막 줄은 단순 매수/관망/매도가 아니라 구체적 행동 제안으로 작성
  예: "종합의견: XX 비중 축소 후 YY 섹터 분산 고려 / 추가매수보다 현금 비중 확보 권장"
- 마크다운 기호 사용 금지`

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: '당신은 한국어 전용 포트폴리오 분석가입니다. 반드시 순수한 한국어(한글)만 사용하세요. 한자·일본어·중국어는 절대 사용하지 마세요. 투자 판단은 항상 데이터 기반으로 냉철하게 작성하고, 근거 없는 낙관론은 금지합니다.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 700,
    }),
  })

  const groqData = await groqRes.json()
  if (!groqRes.ok) {
    const msg = groqData?.error?.message || 'Groq API 오류'
    return NextResponse.json({ error: `[${groqRes.status}] ${msg}` }, { status: groqRes.status })
  }

  const text: string = groqData.choices?.[0]?.message?.content || ''
  return NextResponse.json({ analysis: text, vix, fearGreed, buffett })
}

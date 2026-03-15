import { AnalysisResult, Recommendation } from '@/types'

interface AnalysisInput {
  symbol: string
  currentPrice: number
  previousClose: number
  high52: number
  low52: number
  pe?: number
  eps?: number
  volume: number
  avgVolume: number
  analystTargetPrice?: number
  analystRating?: string  // strongBuy, buy, hold, sell, strongSell counts as string like "3,5,8,2,1"
  strongBuy?: number
  buy?: number
  hold?: number
  sell?: number
  strongSell?: number
  fearGreedIndex?: number
  buffettIndicator?: number
}

function scoreToRecommendation(score: number): Recommendation {
  if (score >= 75) return 'STRONG_BUY'
  if (score >= 60) return 'BUY'
  if (score >= 40) return 'HOLD'
  if (score >= 25) return 'SELL'
  return 'STRONG_SELL'
}

function recommendationLabel(rec: Recommendation): string {
  const labels: Record<Recommendation, string> = {
    STRONG_BUY: '적극매수',
    BUY: '매수',
    HOLD: '관망',
    SELL: '매도',
    STRONG_SELL: '적극매도',
  }
  return labels[rec]
}

export function analyzeStock(input: AnalysisInput): AnalysisResult {
  // 1. Technical Score (25점): RSI proxy, 52주 위치
  const range52 = input.high52 - input.low52
  const position52 = range52 > 0 ? (input.currentPrice - input.low52) / range52 : 0.5
  // 52주 중간 근처가 좋음 (과매수/과매도 판단)
  const positionScore = position52 < 0.3 ? 70 : position52 > 0.85 ? 35 : 55

  // 거래량 momentum
  const volumeRatio = input.avgVolume > 0 ? input.volume / input.avgVolume : 1
  const volumeScore = volumeRatio > 1.5 ? 65 : volumeRatio > 1.0 ? 55 : 45

  const technicalScore = Math.round((positionScore * 0.6 + volumeScore * 0.4))

  // 2. Analyst Score (30점): 애널리스트 추천 기반
  let analystScore = 50
  const totalAnalysts = (input.strongBuy || 0) + (input.buy || 0) + (input.hold || 0) + (input.sell || 0) + (input.strongSell || 0)
  if (totalAnalysts > 0) {
    const weightedScore = (
      (input.strongBuy || 0) * 100 +
      (input.buy || 0) * 75 +
      (input.hold || 0) * 50 +
      (input.sell || 0) * 25 +
      (input.strongSell || 0) * 0
    ) / totalAnalysts
    analystScore = Math.round(weightedScore)
  }

  // 3. Valuation Score (20점): 목표주가 대비 현재가
  let valuationScore = 50
  if (input.analystTargetPrice && input.currentPrice > 0) {
    const upside = (input.analystTargetPrice - input.currentPrice) / input.currentPrice
    if (upside > 0.3) valuationScore = 90
    else if (upside > 0.15) valuationScore = 75
    else if (upside > 0.05) valuationScore = 60
    else if (upside > -0.05) valuationScore = 50
    else if (upside > -0.15) valuationScore = 35
    else valuationScore = 20
  }
  if (input.pe !== undefined && input.pe !== null) {
    if (input.pe > 0 && input.pe < 15) valuationScore = Math.min(100, valuationScore + 10)
    else if (input.pe > 40) valuationScore = Math.max(0, valuationScore - 10)
  }

  // 4. Sentiment Score (15점): 공포탐욕지수
  let sentimentScore = 50
  if (input.fearGreedIndex !== undefined) {
    const fg = input.fearGreedIndex
    // 극공포(낮음)=매수 기회, 극탐욕(높음)=주의
    if (fg < 25) sentimentScore = 75
    else if (fg < 45) sentimentScore = 62
    else if (fg < 55) sentimentScore = 50
    else if (fg < 75) sentimentScore = 40
    else sentimentScore = 28
  }

  // 5. Momentum Score (10점): 버핏지수 (시장 전체 밸류에이션)
  let momentumScore = 50
  if (input.buffettIndicator !== undefined) {
    const bi = input.buffettIndicator
    if (bi < 80) momentumScore = 75
    else if (bi < 100) momentumScore = 60
    else if (bi < 120) momentumScore = 45
    else if (bi < 150) momentumScore = 30
    else momentumScore = 20
  }

  // Weighted total
  const totalScore = Math.round(
    technicalScore * 0.25 +
    analystScore * 0.30 +
    valuationScore * 0.20 +
    sentimentScore * 0.15 +
    momentumScore * 0.10
  )

  const clampedScore = Math.max(0, Math.min(100, totalScore))
  const recommendation = scoreToRecommendation(clampedScore)

  // Generate reasoning
  const reasons: string[] = []

  if (analystScore >= 70) reasons.push(`애널리스트 ${totalAnalysts}명 중 다수가 매수 의견`)
  else if (analystScore <= 35) reasons.push(`애널리스트 다수 매도 의견 제시`)

  if (input.analystTargetPrice) {
    const upside = ((input.analystTargetPrice - input.currentPrice) / input.currentPrice * 100).toFixed(1)
    const upsideNum = parseFloat(upside)
    if (upsideNum > 0) reasons.push(`목표주가 $${input.analystTargetPrice.toFixed(2)} 대비 ${upside}% 상승 여력`)
    else reasons.push(`목표주가 $${input.analystTargetPrice.toFixed(2)} 대비 ${Math.abs(upsideNum).toFixed(1)}% 하락 위험`)
  }

  if (position52 < 0.3) reasons.push(`52주 저점 근접 (현재 저평가 구간)`)
  else if (position52 > 0.85) reasons.push(`52주 고점 근접 (과매수 주의)`)

  if (input.fearGreedIndex !== undefined) {
    if (input.fearGreedIndex < 30) reasons.push(`시장 공포 극심 (역발상 매수 기회)`)
    else if (input.fearGreedIndex > 70) reasons.push(`시장 과열 (탐욕 지수 높음, 주의 필요)`)
  }

  if (input.buffettIndicator !== undefined) {
    if (input.buffettIndicator > 150) reasons.push(`버핏지수 ${input.buffettIndicator.toFixed(0)}%로 시장 전반 고평가`)
    else if (input.buffettIndicator < 80) reasons.push(`버핏지수 ${input.buffettIndicator.toFixed(0)}%로 저평가 구간`)
  }

  if (reasons.length === 0) reasons.push('종합 지표 중립 상태')

  const reasoning = `[${recommendationLabel(recommendation)}] ${reasons.join('. ')}.`

  return {
    symbol: input.symbol,
    score: clampedScore,
    recommendation,
    reasoning,
    details: {
      technicalScore,
      analystScore,
      valuationScore,
      sentimentScore,
      momentumScore,
    },
    analystTargetPrice: input.analystTargetPrice,
    currentPrice: input.currentPrice,
    fearGreedIndex: input.fearGreedIndex,
    buffettIndicator: input.buffettIndicator,
  }
}

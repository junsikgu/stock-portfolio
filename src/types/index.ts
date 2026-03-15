export interface Stock {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  marketCap?: number
  pe?: number
  eps?: number
  high52?: number
  low52?: number
  volume?: number
  avgVolume?: number
}

export interface PortfolioHolding {
  id: string
  user_id: string
  symbol: string
  name: string
  quantity: number
  avg_price: number
  created_at: string
}

export interface WatchlistItem {
  id: string
  user_id: string
  symbol: string
  name: string
  created_at: string
}

export type Recommendation = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'

export interface AnalysisResult {
  symbol: string
  score: number
  recommendation: Recommendation
  reasoning: string
  details: {
    technicalScore: number
    analystScore: number
    valuationScore: number
    sentimentScore: number
    momentumScore: number
  }
  analystTargetPrice?: number
  currentPrice: number
  analystRecommendation?: string
  fearGreedIndex?: number
  buffettIndicator?: number
}

export interface MarketData {
  fearGreedIndex: number
  fearGreedLabel: string
  buffettIndicator: number
}

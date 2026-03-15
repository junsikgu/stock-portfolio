// 한국어 검색 사전: 한국어 키워드 → 종목 정보
export const KOREAN_STOCK_DICT: Array<{
  keywords: string[]
  symbol: string
  name: string
  exchange: string
}> = [
  // 미국 빅테크
  { keywords: ['애플', '아이폰', '아이패드', '맥북'], symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
  { keywords: ['테슬라', '전기차'], symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ' },
  { keywords: ['마이크로소프트', '마소', '윈도우', '엑스박스'], symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
  { keywords: ['구글', '알파벳', '유튜브'], symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ' },
  { keywords: ['아마존', '아마존닷컴'], symbol: 'AMZN', name: 'Amazon.com, Inc.', exchange: 'NASDAQ' },
  { keywords: ['메타', '페이스북', '인스타그램', '왓츠앱'], symbol: 'META', name: 'Meta Platforms, Inc.', exchange: 'NASDAQ' },
  { keywords: ['엔비디아', '그래픽카드', 'GPU'], symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
  { keywords: ['넷플릭스'], symbol: 'NFLX', name: 'Netflix, Inc.', exchange: 'NASDAQ' },
  { keywords: ['스포티파이', '스포티파이'], symbol: 'SPOT', name: 'Spotify Technology S.A.', exchange: 'NYSE' },
  { keywords: ['AMD', '에이엠디'], symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', exchange: 'NASDAQ' },
  { keywords: ['인텔'], symbol: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ' },
  { keywords: ['오라클'], symbol: 'ORCL', name: 'Oracle Corporation', exchange: 'NYSE' },
  { keywords: ['세일즈포스'], symbol: 'CRM', name: 'Salesforce, Inc.', exchange: 'NYSE' },
  { keywords: ['어도비'], symbol: 'ADBE', name: 'Adobe Inc.', exchange: 'NASDAQ' },
  { keywords: ['쇼피파이'], symbol: 'SHOP', name: 'Shopify Inc.', exchange: 'NYSE' },
  { keywords: ['팔란티어'], symbol: 'PLTR', name: 'Palantir Technologies Inc.', exchange: 'NASDAQ' },
  { keywords: ['코인베이스', '암호화폐거래소'], symbol: 'COIN', name: 'Coinbase Global, Inc.', exchange: 'NASDAQ' },
  { keywords: ['로블록스'], symbol: 'RBLX', name: 'Roblox Corporation', exchange: 'NYSE' },
  { keywords: ['스냅챗', '스냅'], symbol: 'SNAP', name: 'Snap Inc.', exchange: 'NYSE' },
  { keywords: ['트위터', '엑스'], symbol: 'X', name: 'X Corp.', exchange: 'NYSE' },
  { keywords: ['우버'], symbol: 'UBER', name: 'Uber Technologies, Inc.', exchange: 'NYSE' },
  { keywords: ['에어비앤비'], symbol: 'ABNB', name: 'Airbnb, Inc.', exchange: 'NASDAQ' },
  { keywords: ['줌', '줌비디오'], symbol: 'ZM', name: 'Zoom Video Communications, Inc.', exchange: 'NASDAQ' },
  { keywords: ['스퀘어', '블록'], symbol: 'SQ', name: 'Block, Inc.', exchange: 'NYSE' },
  { keywords: ['페이팔'], symbol: 'PYPL', name: 'PayPal Holdings, Inc.', exchange: 'NASDAQ' },
  { keywords: ['트위치', '아마존게임'], symbol: 'AMZN', name: 'Amazon.com, Inc.', exchange: 'NASDAQ' },

  // 금융
  { keywords: ['버크셔', '워런버핏'], symbol: 'BRK-B', name: 'Berkshire Hathaway Inc.', exchange: 'NYSE' },
  { keywords: ['JP모건', '제이피모건'], symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE' },
  { keywords: ['골드만삭스'], symbol: 'GS', name: 'The Goldman Sachs Group, Inc.', exchange: 'NYSE' },
  { keywords: ['뱅크오브아메리카', '뱅크오브아메리카'], symbol: 'BAC', name: 'Bank of America Corporation', exchange: 'NYSE' },
  { keywords: ['비자'], symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE' },
  { keywords: ['마스터카드'], symbol: 'MA', name: 'Mastercard Incorporated', exchange: 'NYSE' },

  // 소비재/헬스케어
  { keywords: ['코카콜라', '코크'], symbol: 'KO', name: 'The Coca-Cola Company', exchange: 'NYSE' },
  { keywords: ['펩시', '펩시콜라'], symbol: 'PEP', name: 'PepsiCo, Inc.', exchange: 'NASDAQ' },
  { keywords: ['맥도날드', '맥날'], symbol: 'MCD', name: "McDonald's Corporation", exchange: 'NYSE' },
  { keywords: ['스타벅스'], symbol: 'SBUX', name: 'Starbucks Corporation', exchange: 'NASDAQ' },
  { keywords: ['나이키'], symbol: 'NKE', name: 'NIKE, Inc.', exchange: 'NYSE' },
  { keywords: ['존슨앤존슨', '존슨앤드존슨'], symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE' },
  { keywords: ['화이자', '파이저'], symbol: 'PFE', name: 'Pfizer Inc.', exchange: 'NYSE' },
  { keywords: ['모더나'], symbol: 'MRNA', name: 'Moderna, Inc.', exchange: 'NASDAQ' },
  { keywords: ['월마트'], symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE' },
  { keywords: ['디즈니'], symbol: 'DIS', name: 'The Walt Disney Company', exchange: 'NYSE' },
  { keywords: ['엑손모빌', '엑슨'], symbol: 'XOM', name: 'Exxon Mobil Corporation', exchange: 'NYSE' },

  // 한국 주식 (KRX)
  { keywords: ['삼성전자', '삼성'], symbol: '005930.KS', name: '삼성전자', exchange: 'KRX' },
  { keywords: ['SK하이닉스', '하이닉스'], symbol: '000660.KS', name: 'SK하이닉스', exchange: 'KRX' },
  { keywords: ['LG에너지솔루션', 'LG에너지', '엘지에너지'], symbol: '373220.KS', name: 'LG에너지솔루션', exchange: 'KRX' },
  { keywords: ['삼성바이오로직스', '삼바'], symbol: '207940.KS', name: '삼성바이오로직스', exchange: 'KRX' },
  { keywords: ['현대차', '현대자동차'], symbol: '005380.KS', name: '현대자동차', exchange: 'KRX' },
  { keywords: ['기아', '기아차', '기아자동차'], symbol: '000270.KS', name: '기아', exchange: 'KRX' },
  { keywords: ['POSCO', '포스코'], symbol: '005490.KS', name: 'POSCO홀딩스', exchange: 'KRX' },
  { keywords: ['카카오'], symbol: '035720.KS', name: '카카오', exchange: 'KRX' },
  { keywords: ['카카오뱅크'], symbol: '323410.KS', name: '카카오뱅크', exchange: 'KRX' },
  { keywords: ['네이버', 'NAVER'], symbol: '035420.KS', name: 'NAVER', exchange: 'KRX' },
  { keywords: ['셀트리온'], symbol: '068270.KS', name: '셀트리온', exchange: 'KRX' },
  { keywords: ['LG화학', '엘지화학'], symbol: '051910.KS', name: 'LG화학', exchange: 'KRX' },
  { keywords: ['현대모비스', '모비스'], symbol: '012330.KS', name: '현대모비스', exchange: 'KRX' },
  { keywords: ['삼성SDI', '삼성sdi'], symbol: '006400.KS', name: '삼성SDI', exchange: 'KRX' },
  { keywords: ['KB금융', 'KB'], symbol: '105560.KS', name: 'KB금융', exchange: 'KRX' },
  { keywords: ['신한지주', '신한은행'], symbol: '055550.KS', name: '신한지주', exchange: 'KRX' },
  { keywords: ['하나금융', '하나은행'], symbol: '086790.KS', name: '하나금융지주', exchange: 'KRX' },
  { keywords: ['우리금융', '우리은행'], symbol: '316140.KS', name: '우리금융지주', exchange: 'KRX' },
  { keywords: ['LG전자', '엘지전자'], symbol: '066570.KS', name: 'LG전자', exchange: 'KRX' },
  { keywords: ['SK텔레콤', 'SKT'], symbol: '017670.KS', name: 'SK텔레콤', exchange: 'KRX' },
  { keywords: ['KT'], symbol: '030200.KS', name: 'KT', exchange: 'KRX' },
  { keywords: ['두산에너빌리티', '두산중공업'], symbol: '034020.KS', name: '두산에너빌리티', exchange: 'KRX' },
  { keywords: ['한화에어로스페이스', '한화에어로'], symbol: '012450.KS', name: '한화에어로스페이스', exchange: 'KRX' },
  { keywords: ['크래프톤', '배틀그라운드'], symbol: '259960.KS', name: '크래프톤', exchange: 'KRX' },
  { keywords: ['엔씨소프트', '엔씨'], symbol: '036570.KS', name: '엔씨소프트', exchange: 'KRX' },
  { keywords: ['넥슨', '넥슨게임즈'], symbol: '225570.KQ', name: '넥슨게임즈', exchange: 'KOSDAQ' },
  { keywords: ['카카오게임즈'], symbol: '293490.KQ', name: '카카오게임즈', exchange: 'KOSDAQ' },
  { keywords: ['펄어비스', '검은사막'], symbol: '263750.KQ', name: '펄어비스', exchange: 'KOSDAQ' },
  { keywords: ['하이브', 'BTS', '방탄소년단'], symbol: '352820.KS', name: 'HYBE', exchange: 'KRX' },
  { keywords: ['SM엔터', 'SM엔터테인먼트'], symbol: '041510.KS', name: 'SM엔터테인먼트', exchange: 'KRX' },
  { keywords: ['JYP', 'JYP엔터'], symbol: '035900.KQ', name: 'JYP Ent.', exchange: 'KOSDAQ' },
  { keywords: ['YG엔터', 'YG엔터테인먼트'], symbol: '122870.KQ', name: 'YG PLUS', exchange: 'KOSDAQ' },

  // ETF
  { keywords: ['SPY', 'S&P500', 'S&P 500', 'SP500'], symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE Arca' },
  { keywords: ['QQQ', '나스닥100', '나스닥ETF'], symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ' },
  { keywords: ['VOO', '뱅가드'], symbol: 'VOO', name: 'Vanguard S&P 500 ETF', exchange: 'NYSE Arca' },
  { keywords: ['SOXL', '반도체레버리지'], symbol: 'SOXL', name: 'Direxion Daily Semiconductor Bull 3X', exchange: 'NYSE Arca' },
  { keywords: ['TQQQ', '나스닥레버리지'], symbol: 'TQQQ', name: 'ProShares UltraPro QQQ', exchange: 'NASDAQ' },
  { keywords: ['SCHD', '배당ETF'], symbol: 'SCHD', name: 'Schwab U.S. Dividend Equity ETF', exchange: 'NYSE Arca' },
  { keywords: ['금ETF', 'GLD'], symbol: 'GLD', name: 'SPDR Gold Shares', exchange: 'NYSE Arca' },
]

export function searchKorean(query: string) {
  const q = query.trim()
  if (!q) return []

  return KOREAN_STOCK_DICT.filter(item =>
    item.keywords.some(kw => kw.includes(q) || q.includes(kw))
  ).slice(0, 8).map(item => ({
    symbol: item.symbol,
    name: item.name,
    exchange: item.exchange,
  }))
}

# 주식 포트폴리오 AI 분석

미국 주식 포트폴리오를 AI가 종합 분석해주는 Next.js 웹 앱

## 설정 방법

### 1. Supabase 설정
1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `supabase-schema.sql` 실행
3. Project Settings > API에서 URL과 anon key 복사

### 2. API 키 발급
- **Finnhub**: [finnhub.io](https://finnhub.io) 무료 가입 후 API key 발급
- **FRED**: [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html) API key 발급

### 3. 환경변수 설정
`.env.local` 파일에 다음을 입력:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
FINNHUB_API_KEY=your_finnhub_api_key
FRED_API_KEY=your_fred_api_key
```

### 4. 실행
```bash
npm run dev
```

### 5. Vercel 배포
1. GitHub에 push
2. Vercel에서 import
3. Environment Variables에 위 4개 값 추가
4. Deploy

## AI 분석 점수 구성
- 기술적 분석 (25%): 52주 위치, 거래량
- 애널리스트 의견 (30%): Finnhub 추천
- 밸류에이션 (20%): 목표주가 대비
- 시장심리 (15%): CNN 공포탐욕지수
- 거시경제 (10%): 버핏지수

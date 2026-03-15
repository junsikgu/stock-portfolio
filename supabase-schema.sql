-- portfolio_holdings table
CREATE TABLE IF NOT EXISTS portfolio_holdings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  avg_price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own holdings"
  ON portfolio_holdings
  FOR ALL
  USING (auth.uid() = user_id);

-- portfolio_holdings: target_price, memo 컬럼 추가
ALTER TABLE portfolio_holdings ADD COLUMN IF NOT EXISTS target_price NUMERIC;
ALTER TABLE portfolio_holdings ADD COLUMN IF NOT EXISTS memo TEXT;

-- watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own watchlist"
  ON watchlist
  FOR ALL
  USING (auth.uid() = user_id);

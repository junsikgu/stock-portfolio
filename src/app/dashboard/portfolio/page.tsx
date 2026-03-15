import { createClient } from '@/lib/supabase/server'
import PortfolioClient from './PortfolioClient'

export default async function PortfolioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: holdings } = await supabase
    .from('portfolio_holdings')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return <PortfolioClient initialHoldings={holdings || []} />
}

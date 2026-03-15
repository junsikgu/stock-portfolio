import { createClient } from '@/lib/supabase/server'
import WatchlistClient from './WatchlistClient'

export default async function WatchlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: watchlist } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return <WatchlistClient initialWatchlist={watchlist || []} />
}

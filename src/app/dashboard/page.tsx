import { createClient } from '@/lib/supabase/server'
import MarketOverview from '@/components/MarketOverview'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: holdings } = await supabase
    .from('portfolio_holdings')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const { data: watchlist } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', user!.id)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">대시보드</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">시장 현황과 내 포트폴리오를 한눈에 확인하세요</p>
      </div>

      <MarketOverview />

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700 dark:text-gray-200">내 포트폴리오</h2>
            <Link href="/dashboard/portfolio" className="text-blue-600 dark:text-blue-400 text-xs hover:underline">전체보기</Link>
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{holdings?.length || 0}
            <span className="text-base font-normal text-gray-400 dark:text-gray-500 ml-1">종목</span>
          </div>
          {holdings && holdings.length > 0 ? (
            <div className="mt-3 space-y-2">
              {holdings.slice(0, 3).map((h: any) => (
                <div key={h.id} className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{h.symbol}</span>
                  <span className="text-gray-500 dark:text-gray-400">{h.quantity}주 @ ${h.avg_price}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-3">아직 종목이 없습니다</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700 dark:text-gray-200">관심 종목</h2>
            <Link href="/dashboard/watchlist" className="text-blue-600 dark:text-blue-400 text-xs hover:underline">전체보기</Link>
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{watchlist?.length || 0}
            <span className="text-base font-normal text-gray-400 dark:text-gray-500 ml-1">종목</span>
          </div>
          {watchlist && watchlist.length > 0 ? (
            <div className="mt-3 space-y-2">
              {watchlist.slice(0, 3).map((w: any) => (
                <div key={w.id} className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{w.symbol}</span>
                  <span className="text-gray-400 dark:text-gray-500">{w.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-3">아직 종목이 없습니다</p>
          )}
        </div>
      </div>
    </div>
  )
}

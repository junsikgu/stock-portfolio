import { createClient } from '@/lib/supabase/server'
import MarketOverview from '@/components/MarketOverview'
import DashboardOverview from '@/components/DashboardOverview'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: holdings } = await supabase
    .from('portfolio_holdings')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">지금 사야 할까, 팔아야 할까?</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">AI가 내 포트폴리오를 실시간으로 분석해드려요</p>
      </div>

      {/* 포트폴리오 AI 현황 — 가장 중요한 정보를 최상단에 */}
      <DashboardOverview holdings={holdings || []} />

      {/* 시장 지표 */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">시장 지표</h2>
        <MarketOverview />
      </div>
    </div>
  )
}

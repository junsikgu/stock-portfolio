import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-white">
            주식 포트폴리오 <span className="text-blue-300">AI 분석</span>
          </h1>
          <p className="text-xl text-blue-200">
            미국 주식을 AI가 종합 분석하여 매수/매도 시점을 알려드립니다
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { icon: '📊', title: '포트폴리오 관리', desc: '보유 종목 수익률 추적' },
            { icon: '🤖', title: 'AI 종합 분석', desc: '0~100점 스코어링 시스템' },
            { icon: '📈', title: '매수/매도 추천', desc: '5단계 추천 + 근거 제공' },
          ].map((item) => (
            <div key={item.title} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="text-white font-semibold text-sm">{item.title}</div>
              <div className="text-blue-300 text-xs mt-1">{item.desc}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/signup"
            className="bg-blue-500 hover:bg-blue-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            무료로 시작하기
          </Link>
          <Link
            href="/login"
            className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-lg font-semibold transition-colors backdrop-blur-sm"
          >
            로그인
          </Link>
        </div>
      </div>
    </div>
  )
}

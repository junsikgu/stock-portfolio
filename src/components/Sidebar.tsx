'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useTheme } from './ThemeProvider'

const navItems = [
  { href: '/dashboard', label: '대시보드', icon: '📊' },
  { href: '/dashboard/search', label: '검색', icon: '🔍' },
  { href: '/dashboard/portfolio', label: '포트폴리오', icon: '💼' },
  { href: '/dashboard/watchlist', label: '관심', icon: '⭐' },
]

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { theme, toggle } = useTheme()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* 데스크탑 사이드바 */}
      <aside className="hidden md:flex w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex-col shadow-sm shrink-0">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-lg font-bold text-blue-700 dark:text-blue-400">주식 AI 분석</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{userEmail}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
          <button
            onClick={toggle}
            className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            {theme === 'dark' ? '라이트 모드' : '다크 모드'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <span>🚪</span>
            로그아웃
          </button>
        </div>
      </aside>

      {/* 모바일 하단 탭바 */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {navItems.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium transition-colors min-h-[52px]',
                active
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 dark:text-gray-500 active:text-gray-600 dark:active:text-gray-300'
              )}
            >
              <span className={cn('text-xl leading-none transition-transform', active && 'scale-110')}>{item.icon}</span>
              <span className={cn('transition-colors', active && 'font-bold')}>{item.label}</span>
              {active && <span className="absolute bottom-0 mb-0 w-8 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />}
            </Link>
          )
        })}
        <button
          onClick={toggle}
          className="flex-none px-3 flex flex-col items-center justify-center py-3 gap-0.5 text-xs text-gray-400 dark:text-gray-500 min-h-[52px] active:text-gray-600 dark:active:text-gray-300"
        >
          <span className="text-xl leading-none">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>테마</span>
        </button>
      </nav>
    </>
  )
}

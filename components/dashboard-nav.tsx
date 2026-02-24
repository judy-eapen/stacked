'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Users, ListTodo, FileText, UserPlus } from 'lucide-react'

export const dashboardNavItems = [
  { label: 'Today', href: '/dashboard/today', icon: Calendar },
  { label: 'Identities', href: '/dashboard/identities', icon: Users },
  { label: 'Habits', href: '/dashboard/habits', icon: ListTodo },
  { label: 'Review', href: '/dashboard/review', icon: FileText },
  { label: 'Partners', href: '/dashboard/partners', icon: UserPlus },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1" aria-label="Main">
      {dashboardNavItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[#e87722] text-white'
                : 'text-gray-700 hover:bg-[#e87722]/10 hover:text-gray-900'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

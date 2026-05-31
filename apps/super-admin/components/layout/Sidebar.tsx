'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import {
  LayoutDashboard, Building2, Users, UserCheck,
  CreditCard, Settings2, Flag, LogOut, ChevronRight, BarChart3
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Clubs', href: '/clubs', icon: Building2 },
  { label: 'Club Admins', href: '/admins', icon: UserCheck },
  { label: 'Caddies', href: '/caddies', icon: Users },
  { label: 'Payments', href: '/payments', icon: CreditCard },
  { label: 'Platform Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Flags & Alerts', href: '/flags', icon: Flag },
]

const generalItems = [
  { label: 'Platform Config', href: '/config', icon: Settings2 },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <aside className="portal-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-4 px-5 py-8 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <img src="/logo.png" alt="Score Caddie Logo" className="h-14 w-auto object-contain flex-shrink-0" />
        <div>
          <p className="text-white font-bold text-lg leading-tight">Score Caddie</p>
          <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>Super Admin</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        <p className="text-[11px] font-bold uppercase tracking-wider px-3 mb-4"
          style={{ color: 'rgba(255,255,255,0.4)' }}>Menu</p>

        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className={`sidebar-nav-link ${active ? 'active' : ''}`}>
              <Icon size={18} strokeWidth={active ? 2.5 : 2} className="nav-icon" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={15} />}
            </Link>
          )
        })}

        <div className="pt-6">
          <p className="text-[11px] font-bold uppercase tracking-wider px-3 mb-4"
            style={{ color: 'rgba(255,255,255,0.4)' }}>General</p>
          {generalItems.map(({ label, href, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}
                className={`sidebar-nav-link ${active ? 'active' : ''}`}>
                <Icon size={18} strokeWidth={active ? 2.5 : 2} className="nav-icon" />
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User + Sign Out */}
      <div className="px-3 pb-5 border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1"
          style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <span className="text-white text-xs font-bold">IA</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">Ian</p>
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>Super Admin</p>
          </div>
        </div>
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
          style={{ color: 'rgba(255,255,255,0.55)' }}>
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}

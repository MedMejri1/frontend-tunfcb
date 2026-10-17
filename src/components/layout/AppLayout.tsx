import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Bell,
  CircleHelp,
  Coffee,
  Coins,
  Flag,
  HeartPulse,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  Package,
  Settings2,
  ShoppingBag,
  ShieldCheck,
  Target,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from '@/components/common/Logo'
import { UserAvatar } from '@/components/common'
import { useAuth } from '@/lib/auth'
import { useCafesSummary } from '@/features/cafes/api'
import { useShopSummary } from '@/features/shop/api'
import { useSupportSummary } from '@/features/support/api'
import { useWallSummary } from '@/features/wall/api'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  superAdmin?: boolean
  /** Counter shown next to the label (work waiting for the team). */
  badge?: 'orders' | 'support' | 'cafes' | 'wall'
}

const SECTIONS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Pilotage',
    items: [
      { to: '/', label: 'Tableau de bord', icon: LayoutDashboard },
      { to: '/users', label: 'Utilisateurs', icon: Users },
      { to: '/leaderboard', label: 'Classement', icon: Trophy },
      { to: '/transactions', label: 'Transactions', icon: Coins },
    ],
  },
  {
    title: 'Équipe',
    items: [{ to: '/team/injuries', label: 'Infirmerie', icon: HeartPulse }],
  },
  {
    title: 'Jeux',
    items: [
      { to: '/games/quiz', label: 'Quiz', icon: CircleHelp },
      { to: '/games/predictions', label: 'Pronostics', icon: Target },
      { to: '/games/missions', label: 'Missions', icon: Flag },
      { to: '/settings', label: 'Règles & récompenses', icon: Settings2 },
    ],
  },
  {
    title: 'Boutique',
    items: [
      { to: '/shop/products', label: 'Articles', icon: Package },
      { to: '/shop/orders', label: 'Commandes', icon: ShoppingBag, badge: 'orders' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { to: '/support', label: 'Messages', icon: Inbox, badge: 'support' },
      { to: '/wall', label: 'Mur des fans', icon: MessagesSquare, badge: 'wall' },
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/cafes', label: 'Cafés', icon: Coffee, badge: 'cafes' },
    ],
  },
  {
    title: 'Administration',
    items: [{ to: '/admins', label: 'Administrateurs', icon: ShieldCheck, superAdmin: true }],
  },
]

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { isSuperAdmin } = useAuth()
  const badges = {
    orders: useShopSummary().data?.ordersByStatus.pending ?? 0,
    support: useSupportSummary().data?.awaiting ?? 0,
    cafes: useCafesSummary().data?.pending ?? 0,
    wall: useWallSummary().data?.reported ?? 0,
  }
  return (
    <nav className="flex h-full flex-col bg-navy-900 text-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <Logo className="h-12 w-12" />
        <div>
          <p className="text-[15px] font-extrabold leading-tight">Tunfcb</p>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gold">Administration</p>
        </div>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {SECTIONS.map((section) => {
          const items = section.items.filter((i) => !i.superAdmin || isSuperAdmin)
          if (!items.length) return null
          return (
            <div key={section.title}>
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{section.title}</p>
              <div className="space-y-0.5">
                {items.map(({ to, label, icon: Icon, badge }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-gradient-to-r from-blau to-grana text-white shadow-lg shadow-black/20'
                          : 'text-white/70 hover:bg-white/5 hover:text-white',
                      )
                    }
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {label}
                    {badge && badges[badge] > 0 && (
                      <span className="ml-auto rounded-full bg-gold px-2 py-0.5 text-[11px] font-extrabold text-navy-900">{badges[badge]}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div className="h-1 bg-gradient-to-r from-blau via-grana to-gold" />
    </nav>
  )
}

const TODAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())

export function AppLayout() {
  const { admin, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
          <button
            className="cursor-pointer rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="hidden text-sm font-medium capitalize text-slate-500 lg:block">{TODAY}</div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800">{admin?.name}</p>
              <p className="text-[11px] text-slate-500">
                {admin?.role === 'super_admin' ? 'Super administrateur' : 'Administrateur'}
              </p>
            </div>
            <UserAvatar name={admin?.name ?? 'Admin'} size="sm" />
            <button
              onClick={logout}
              className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-tunisia"
              title="Se déconnecter"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth } from '@/lib/auth'
import { LoginPage } from '@/features/auth/LoginPage'

// Each page is its own chunk (charts and tables load only when opened).
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })))

const DashboardPage = page(() => import('@/features/dashboard/DashboardPage'), 'DashboardPage')
const UsersPage = page(() => import('@/features/users/UsersPage'), 'UsersPage')
const UserDetailPage = page(() => import('@/features/users/UserDetailPage'), 'UserDetailPage')
const LeaderboardPage = page(() => import('@/features/leaderboard/LeaderboardPage'), 'LeaderboardPage')
const TransactionsPage = page(() => import('@/features/transactions/TransactionsPage'), 'TransactionsPage')
const QuizPage = page(() => import('@/features/games/QuizPage'), 'QuizPage')
const PredictionsPage = page(() => import('@/features/games/PredictionsPage'), 'PredictionsPage')
const MissionsPage = page(() => import('@/features/games/MissionsPage'), 'MissionsPage')
const SettingsPage = page(() => import('@/features/settings/SettingsPage'), 'SettingsPage')
const NotificationsPage = page(() => import('@/features/notifications/NotificationsPage'), 'NotificationsPage')
const AdminsPage = page(() => import('@/features/admins/AdminsPage'), 'AdminsPage')
const ProductsPage = page(() => import('@/features/shop/ProductsPage'), 'ProductsPage')
const OrdersPage = page(() => import('@/features/shop/OrdersPage'), 'OrdersPage')
const OrderDetailPage = page(() => import('@/features/shop/OrderDetailPage'), 'OrderDetailPage')
const InjuriesPage = page(() => import('@/features/team/InjuriesPage'), 'InjuriesPage')
const SupportPage = page(() => import('@/features/support/SupportPage'), 'SupportPage')
const SupportDetailPage = page(() => import('@/features/support/SupportDetailPage'), 'SupportDetailPage')

const Spinner = ({ dark }: { dark?: boolean }) => (
  <div className={dark ? 'flex h-screen items-center justify-center bg-navy-900' : 'flex h-96 items-center justify-center'}>
    <Loader2 className={dark ? 'h-8 w-8 animate-spin text-gold' : 'h-6 w-6 animate-spin text-blau'} />
  </div>
)

function RequireAuth({ children }: { children: ReactNode }) {
  const { admin, loading } = useAuth()
  if (loading) return <Spinner dark />
  return admin ? children : <Navigate to="/login" replace />
}

function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const { isSuperAdmin } = useAuth()
  return isSuperAdmin ? children : <Navigate to="/" replace />
}

const withSuspense = (node: ReactNode) => <Suspense fallback={<Spinner />}>{node}</Suspense>

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={withSuspense(<DashboardPage />)} />
        <Route path="users" element={withSuspense(<UsersPage />)} />
        <Route path="users/:id" element={withSuspense(<UserDetailPage />)} />
        <Route path="leaderboard" element={withSuspense(<LeaderboardPage />)} />
        <Route path="transactions" element={withSuspense(<TransactionsPage />)} />
        <Route path="games/quiz" element={withSuspense(<QuizPage />)} />
        <Route path="games/predictions" element={withSuspense(<PredictionsPage />)} />
        <Route path="games/missions" element={withSuspense(<MissionsPage />)} />
        <Route path="settings" element={withSuspense(<SettingsPage />)} />
        <Route path="notifications" element={withSuspense(<NotificationsPage />)} />
        <Route path="shop/products" element={withSuspense(<ProductsPage />)} />
        <Route path="shop/orders" element={withSuspense(<OrdersPage />)} />
        <Route path="shop/orders/:id" element={withSuspense(<OrderDetailPage />)} />
        <Route path="team/injuries" element={withSuspense(<InjuriesPage />)} />
        <Route path="support" element={withSuspense(<SupportPage />)} />
        <Route path="support/:id" element={withSuspense(<SupportDetailPage />)} />
        <Route
          path="admins"
          element={
            <RequireSuperAdmin>{withSuspense(<AdminsPage />)}</RequireSuperAdmin>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

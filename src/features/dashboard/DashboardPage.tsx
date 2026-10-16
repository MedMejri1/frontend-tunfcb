import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, CircleHelp, Coins, Loader2, Target, Trophy, UserPlus, Users } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { CountryFlag, PageHeader, StatCard, UserAvatar } from '@/components/common'
import { api } from '@/lib/api'
import { TRANSACTION_TYPES } from '@/lib/labels'
import type { Overview } from '@/lib/types'
import { formatNumber, timeAgo } from '@/lib/utils'

const shortDay = (key: string) => {
  const [, m, d] = key.split('-')
  return `${d}/${m}`
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: async () => (await api.get<Overview>('/admin/stats/overview')).data,
    refetchInterval: 60_000,
  })

  if (isLoading || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blau" />
      </div>
    )
  }

  const { users, points, games } = data

  return (
    <div className="space-y-6">
      <PageHeader title="Tableau de bord" description="Vue d'ensemble de l'activité des supporters." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Supporters inscrits" value={formatNumber(users.total)} hint={`${users.banned} suspendu(s)`} icon={Users} />
        <StatCard
          label="Nouveaux (7 j)"
          value={formatNumber(users.new7d)}
          hint={`${users.newToday} aujourd'hui · ${users.new30d} sur 30 j`}
          icon={UserPlus}
          tone="green"
        />
        <StatCard
          label="Actifs aujourd'hui"
          value={formatNumber(users.activeToday)}
          hint={`${users.active7d} sur 7 jours`}
          icon={Activity}
          tone="violet"
        />
        <StatCard
          label="Points distribués (7 j)"
          value={`${formatNumber(points.distributed7d)} BP`}
          hint={`${formatNumber(points.distributedToday)} aujourd'hui · ${formatNumber(points.circulating)} en circulation`}
          icon={Coins}
          tone="gold"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MiniStat label="Quiz joués aujourd'hui" value={games.quizToday} icon={CircleHelp} />
        <MiniStat label="Tours de roue" value={games.wheelToday} icon={Trophy} />
        <MiniStat label="Publicités vues" value={games.adsToday} icon={Activity} />
        <MiniStat label="Pronostics du jour" value={games.predictionsToday} icon={Target} />
        <MiniStat label="Matchs ouverts aux pronos" value={games.openMatches} icon={Target} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="flex flex-col xl:col-span-2">
          <CardHeader title="Inscriptions et joueurs actifs" description="30 derniers jours" />
          <CardContent className="min-h-72 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeseries} margin={{ left: -20, right: 8 }}>
                <defs>
                  <linearGradient id="players" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#004d98" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#004d98" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="signups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a50044" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#a50044" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip labelFormatter={(v) => shortDay(String(v))} />
                <Area type="monotone" dataKey="players" name="Joueurs actifs" stroke="#004d98" strokeWidth={2} fill="url(#players)" />
                <Area type="monotone" dataKey="signups" name="Inscriptions" stroke="#a50044" strokeWidth={2} fill="url(#signups)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Origine des points" description="30 derniers jours" />
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.pointsByType} dataKey="points" nameKey="type" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {data.pointsByType.map((t) => (
                      <Cell key={t.type} fill={TRANSACTION_TYPES[t.type]?.color ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [`${formatNumber(Number(v))} BP`, TRANSACTION_TYPES[name as keyof typeof TRANSACTION_TYPES]?.label ?? name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 space-y-1.5">
              {data.pointsByType.map((t) => (
                <li key={t.type} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: TRANSACTION_TYPES[t.type]?.color }} />
                    {TRANSACTION_TYPES[t.type]?.label ?? t.type}
                  </span>
                  <span className="font-semibold text-slate-800">{formatNumber(t.points)} BP</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Points gagnés par jour" description="Hors dépenses" />
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.timeseries} margin={{ left: -10, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip labelFormatter={(v) => shortDay(String(v))} formatter={(v) => [`${formatNumber(Number(v))} BP`, 'Points']} />
                <Bar dataKey="points" fill="#edbb00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Top de la semaine"
            action={
              <Link to="/leaderboard" className="text-xs font-semibold text-blau hover:underline">
                Voir tout
              </Link>
            }
          />
          <ul className="divide-y divide-slate-100">
            {data.topWeek.length === 0 && <li className="px-5 py-8 text-center text-sm text-slate-400">Aucun point cette semaine</li>}
            {data.topWeek.map((e) => (
              <li key={e.userId}>
                <Link to={`/users/${e.userId}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                  <span className="w-5 text-center text-sm font-extrabold text-slate-400">{e.rank}</span>
                  <UserAvatar name={e.name} seed={e.userId} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{e.name}</p>
                    <p className="text-xs text-slate-500">
                      <CountryFlag code={e.country} />Niv. {e.level}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-navy-900">{formatNumber(e.points)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Derniers inscrits"
          action={
            <Link to="/users" className="text-xs font-semibold text-blau hover:underline">
              Tous les utilisateurs
            </Link>
          }
        />
        <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-3">
          {data.recentUsers.map((u) => (
            <Link key={u.id} to={`/users/${u.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
              <UserAvatar name={u.name} seed={u.id} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {u.name} <span className="font-normal text-slate-400">@{u.username}</span>
                </p>
                <p className="text-xs text-slate-500">
                  <CountryFlag code={u.country} />inscrit {timeAgo(u.createdAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <Icon className="h-5 w-5 text-grana" />
      <div>
        <p className="text-lg font-extrabold leading-tight text-navy-900">{formatNumber(value)}</p>
        <p className="text-[11px] text-slate-500">{label}</p>
      </div>
    </div>
  )
}

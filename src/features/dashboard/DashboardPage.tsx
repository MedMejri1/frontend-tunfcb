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
import {
  Activity,
  BellRing,
  CheckCircle2,
  CircleHelp,
  Coffee,
  Coins,
  HeartPulse,
  Inbox,
  Loader2,
  MessageSquareWarning,
  ShoppingBag,
  Smartphone,
  Target,
  Trophy,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CountryFlag, PageHeader, StatCard, UserAvatar } from '@/components/common'
import { api } from '@/lib/api'
import { TRANSACTION_TYPES } from '@/lib/labels'
import type { Overview } from '@/lib/types'
import { cn, formatDt, formatNumber, timeAgo } from '@/lib/utils'

const shortDay = (key: string) => {
  const [, m, d] = key.split('-')
  return `${d}/${m}`
}

// Activity chart series (palette checked for colour-blind separation and contrast on white).
const SERIES = [
  { key: 'players', label: 'Joueurs actifs', color: '#1a5fb4' },
  { key: 'signups', label: 'Inscriptions', color: '#a50044' },
  { key: 'posts', label: 'Publications du mur', color: '#0f9d8a' },
] as const

const REMINDER_LABELS: Record<string, string> = { morning: 'Rappel du matin', evening: 'Rappel du soir' }

/** 1 membre, 2 membres */
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n > 1 ? many : one}`

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

  const { users, points, games, todo, wall, cafes, shop, audience } = data
  const pending = todo.cafesPending + todo.ordersPending + todo.supportOpen + todo.wallReported
  const maxGov = Math.max(1, ...cafes.byGovernorate.map((g) => g.count))

  return (
    <div className="space-y-6">
      <PageHeader title="Tableau de bord" description="Vue d'ensemble de l'app : supporters, jeux, communauté et services." />

      <section aria-labelledby="todo-title">
        <div className="mb-3 flex items-center gap-2">
          <h2 id="todo-title" className="text-sm font-bold text-slate-900">
            À traiter
          </h2>
          {pending === 0 ? (
            <Badge tone="green">
              <CheckCircle2 className="h-3 w-3" /> Tout est à jour
            </Badge>
          ) : (
            <Badge tone="gold">{pending}</Badge>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TodoTile to="/cafes" icon={Coffee} count={todo.cafesPending} label="Cafés à vérifier" done="Aucune demande de café" />
          <TodoTile
            to="/shop/orders?status=pending"
            icon={ShoppingBag}
            count={todo.ordersPending}
            label="Commandes à confirmer"
            done="Aucune commande en attente"
          />
          <TodoTile to="/support" icon={Inbox} count={todo.supportOpen} label="Messages sans réponse" done="Aucun message en attente" />
          <TodoTile
            to="/wall"
            icon={MessageSquareWarning}
            count={todo.wallReported}
            label="Publications signalées"
            done="Aucun signalement sur le mur"
          />
        </div>
      </section>

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
          <CardHeader
            title="Activité de l’app"
            description="30 derniers jours"
            action={
              <ul className="flex flex-wrap justify-end gap-x-4 gap-y-1">
                {SERIES.map((s) => (
                  <li key={s.key} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </li>
                ))}
              </ul>
            }
          />
          <CardContent className="min-h-72 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeseries} margin={{ left: -20, right: 8 }}>
                <defs>
                  {SERIES.map((s) => (
                    <linearGradient key={s.key} id={`area-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip labelFormatter={(v) => shortDay(String(v))} />
                {SERIES.map((s) => (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    fill={`url(#area-${s.key})`}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                  />
                ))}
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

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader
            title="Mur des fans"
            description="7 derniers jours"
            action={<CardLink to="/wall">Modérer</CardLink>}
          />
          <CardContent className="grid grid-cols-2 gap-4">
            <Figure value={wall.posts7d} label="Publications" hint={`${formatNumber(wall.postsToday)} aujourd’hui`} />
            <Figure value={wall.posters7d} label="Auteurs" />
            <Figure value={wall.comments7d} label="Commentaires" />
            <Figure value={wall.reactions7d} label="Réactions" />
          </CardContent>
          {wall.hidden > 0 && (
            <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              {formatNumber(wall.hidden)} publication{wall.hidden > 1 ? 's' : ''} masquée{wall.hidden > 1 ? 's' : ''} au total
            </p>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Cafés publiés"
            description="Où regarder le match"
            action={<CardLink to="/cafes?status=approved">Voir</CardLink>}
          />
          <CardContent>
            <p className="text-3xl font-extrabold text-navy-900">{formatNumber(cafes.approved)}</p>
            {cafes.byGovernorate.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">Aucun café publié pour l’instant.</p>
            ) : (
              <ul className="mt-3 space-y-2" aria-label="Cafés par gouvernorat">
                {cafes.byGovernorate.map((g) => (
                  <li key={g.name} className="text-xs">
                    <div className="mb-1 flex justify-between gap-2">
                      <span className="truncate text-slate-600">{g.name}</span>
                      <span className="font-semibold text-slate-800">{formatNumber(g.count)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full bg-[#1a5fb4]" style={{ width: `${(g.count / maxGov) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Boutique"
            action={shop.open ? <Badge tone="green">Ouverte</Badge> : <Badge>Fermée</Badge>}
          />
          <CardContent className="space-y-4">
            <Figure value={shop.monthOrders} label="Commandes ce mois-ci" hint="Hors annulées" />
            <div>
              <p className="text-2xl font-extrabold text-navy-900">{formatDt(shop.deliveredRevenue)}</p>
              <p className="text-xs text-slate-500">Encaissé (commandes livrées)</p>
            </div>
            <CardLink to="/shop/orders">Toutes les commandes</CardLink>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Audience & équipe" />
          <ul className="divide-y divide-slate-100">
            <AudienceRow
              icon={BellRing}
              label="Joignables en push"
              value={formatNumber(audience.pushMembers + audience.guests)}
              hint={`${plural(audience.pushMembers, 'membre')} · ${plural(audience.guests, 'invité')}`}
            />
            <AudienceRow
              icon={Smartphone}
              label="Téléphones en mode invité"
              value={formatNumber(audience.guests)}
              hint={`${formatNumber(audience.guestsActive7d)} actif(s) sur 7 jours`}
            />
            <AudienceRow
              icon={BellRing}
              label={audience.lastReminder ? (REMINDER_LABELS[audience.lastReminder.kind] ?? 'Dernier rappel') : 'Rappels automatiques'}
              value={audience.lastReminder ? `${formatNumber(audience.lastReminder.sent)} tél.` : '—'}
              hint={audience.lastReminder ? `Envoyé ${timeAgo(audience.lastReminder.at)}` : 'Aucun rappel envoyé'}
            />
            <AudienceRow
              icon={HeartPulse}
              label="Infirmerie"
              value={formatNumber(audience.injured)}
              hint={audience.injured ? (audience.injured > 1 ? 'joueurs blessés' : 'joueur blessé') : 'Aucun blessé'}
              to="/team/injuries"
            />
          </ul>
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

/** One kind of waiting work: highlighted while something needs the team. */
function TodoTile({ to, icon: Icon, count, label, done }: { to: string; icon: LucideIcon; count: number; label: string; done: string }) {
  const waiting = count > 0
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm transition-colors',
        waiting ? 'border-amber-300 hover:bg-amber-50/60' : 'border-slate-200 hover:bg-slate-50',
      )}
    >
      <span className={cn('rounded-lg p-2.5', waiting ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400')}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className={cn('text-2xl font-extrabold leading-tight', waiting ? 'text-navy-900' : 'text-slate-300')}>{formatNumber(count)}</p>
        <p className="truncate text-xs text-slate-500">{waiting ? label : done}</p>
      </div>
    </Link>
  )
}

function Figure({ value, label, hint }: { value: number; label: string; hint?: string }) {
  return (
    <div>
      <p className="text-2xl font-extrabold text-navy-900">{formatNumber(value)}</p>
      <p className="text-xs text-slate-500">{label}</p>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

function CardLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="text-xs font-semibold text-blau hover:underline">
      {children}
    </Link>
  )
}

function AudienceRow({
  icon: Icon,
  label,
  value,
  hint,
  to,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint: string
  to?: string
}) {
  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-700">{label}</p>
        <p className="truncate text-[11px] text-slate-400">{hint}</p>
      </div>
      <span className="text-sm font-bold text-navy-900">{value}</span>
    </>
  )
  return (
    <li>
      {to ? (
        <Link to={to} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
          {content}
        </Link>
      ) : (
        <div className="flex items-center gap-3 px-5 py-3">{content}</div>
      )}
    </li>
  )
}

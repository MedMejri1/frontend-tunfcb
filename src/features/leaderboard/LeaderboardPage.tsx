import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Crown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/form'
import { Tabs } from '@/components/ui/tabs'
import { Pagination, Table, TableState, Td, Th, Tr } from '@/components/ui/table'
import { CountryFlag, PageHeader, UserAvatar } from '@/components/common'
import { api } from '@/lib/api'
import { useUrlFilters } from '@/lib/hooks'
import { COUNTRIES } from '@/lib/labels'
import type { LeaderboardEntry, LeaderboardPeriod, Paginated } from '@/lib/types'
import { cn, formatNumber } from '@/lib/utils'

const PERIODS: Array<{ value: LeaderboardPeriod; label: string }> = [
  { value: 'day', label: "Aujourd'hui" },
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
  { value: 'all', label: 'Général' },
]

const PODIUM_STYLES = [
  'from-amber-300 to-gold text-navy-900 h-36',
  'from-slate-200 to-slate-300 text-navy-900 h-28',
  'from-orange-300 to-amber-600 text-white h-24',
]

export function LeaderboardPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useUrlFilters({ period: 'week', country: '', page: '1' })
  const page = Number(filters.page)

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', filters],
    queryFn: async () =>
      (
        await api.get<Paginated<LeaderboardEntry>>('/admin/leaderboard', {
          params: { period: filters.period, country: filters.country || undefined, page, limit: 50 },
        })
      ).data,
    placeholderData: keepPreviousData,
  })

  const podium = page === 1 ? (data?.items.slice(0, 3) ?? []) : []
  // Visual order: 2nd, 1st, 3rd
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean)

  return (
    <div>
      <PageHeader
        title="Classement"
        description="Points gagnés sur la période (hors dépenses). « Général » = XP total depuis l'inscription."
        actions={
          <Select className="w-44" value={filters.country} onChange={(e) => setFilters({ country: e.target.value })}>
            <option value="">🌍 Tous les pays</option>
            {Object.entries(COUNTRIES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </Select>
        }
      />

      <Tabs value={filters.period as LeaderboardPeriod} onChange={(period) => setFilters({ period })} options={PERIODS} />

      {podiumOrder.length > 0 && (
        <div className="mt-6 flex items-end justify-center gap-4">
          {podiumOrder.map((e) => {
            const style = PODIUM_STYLES[e.rank - 1]
            return (
              <button
                key={e.userId}
                onClick={() => navigate(`/users/${e.userId}`)}
                className="flex w-40 cursor-pointer flex-col items-center text-center"
              >
                {e.rank === 1 && <Crown className="mb-1 h-6 w-6 text-gold" />}
                <UserAvatar name={e.name} seed={e.userId} size="lg" />
                <p className="mt-2 w-full truncate text-sm font-bold text-navy-900">{e.name}</p>
                <p className="text-xs text-slate-500">
                  <CountryFlag code={e.country} />Niv. {e.level}
                </p>
                <div className={cn('mt-2 flex w-full flex-col items-center justify-start rounded-t-xl bg-gradient-to-b pt-3 shadow-sm', style)}>
                  <span className="text-3xl font-black">{e.rank}</span>
                  <span className="text-xs font-bold">{formatNumber(e.points)} BP</span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <Card className="mt-6">
        <Table>
          <thead>
            <tr>
              <Th className="w-16 text-center">Rang</Th>
              <Th>Supporter</Th>
              <Th>Ville</Th>
              <Th className="text-center">Niveau</Th>
              <Th className="text-right">Points</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading || !data ? (
              <TableState colSpan={5} loading />
            ) : data.items.length === 0 ? (
              <TableState colSpan={5} empty="Personne n'a encore marqué de points sur cette période" />
            ) : (
              data.items.map((e) => (
                <Tr key={e.userId} onClick={() => navigate(`/users/${e.userId}`)}>
                  <Td className="text-center text-base font-extrabold text-slate-400">{e.rank}</Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <UserAvatar name={e.name} seed={e.userId} size="sm" />
                      <div>
                        <p className="font-semibold text-slate-800">{e.name}</p>
                        <p className="text-xs text-slate-500">@{e.username}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-slate-600">
                    <CountryFlag code={e.country} />{e.city ?? COUNTRIES[e.country] ?? e.country}
                  </Td>
                  <Td className="text-center font-semibold">{e.level}</Td>
                  <Td className="text-right text-base font-extrabold text-navy-900">{formatNumber(e.points)}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} onPage={(p) => setFilters({ page: String(p) })} />}
      </Card>
    </div>
  )
}

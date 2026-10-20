import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input, Select } from '@/components/ui/form'
import { Pagination, Table, TableState, Td, Th, Tr } from '@/components/ui/table'
import { CountryFlag, PageHeader, UserAvatar } from '@/components/common'
import { COUNTRIES } from '@/lib/labels'
import { useUrlFilters } from '@/lib/hooks'
import { formatNumber, timeAgo, contactLine } from '@/lib/utils'
import { useUsers } from './api'

export function UsersPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useUrlFilters({ search: '', status: '', country: '', sort: 'recent', page: '1' })
  const [search, setSearch] = useState(filters.search)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Push the search to the URL once typing pauses.
  const onSearch = (value: string) => {
    setSearch(value)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setFilters({ search: value.trim() }), 350)
  }

  const { data, isLoading, isFetching } = useUsers({
    search: filters.search || undefined,
    status: filters.status || undefined,
    country: filters.country || undefined,
    sort: filters.sort,
    page: Number(filters.page),
    limit: 20,
  })

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        description="Tous les supporters inscrits sur l'application mobile."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Nom, @pseudo, téléphone, email ou code…"
              className="pl-9"
            />
          </div>
          <Select className="w-44" value={filters.status} onChange={(e) => setFilters({ status: e.target.value })}>
            <option value="">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="banned">Suspendus</option>
          </Select>
          <Select className="w-40" value={filters.country} onChange={(e) => setFilters({ country: e.target.value })}>
            <option value="">Tous les pays</option>
            {Object.entries(COUNTRIES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </Select>
          <Select className="w-48" value={filters.sort} onChange={(e) => setFilters({ sort: e.target.value })}>
            <option value="recent">Plus récents</option>
            <option value="oldest">Plus anciens</option>
            <option value="xp">Plus d'XP</option>
            <option value="balance">Plus gros solde</option>
            <option value="active">Dernière activité</option>
          </Select>
        </div>

        <Table className={isFetching && !isLoading ? 'opacity-60' : undefined}>
          <thead>
            <tr>
              <Th>Supporter</Th>
              <Th>Pays</Th>
              <Th>Niveau</Th>
              <Th className="text-right">Solde</Th>
              <Th className="text-right">XP</Th>
              <Th className="text-center">Série</Th>
              <Th>Statut</Th>
              <Th>Dernière activité</Th>
              <Th>Inscription</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading || !data ? (
              <TableState colSpan={9} loading />
            ) : data.items.length === 0 ? (
              <TableState colSpan={9} empty="Aucun utilisateur ne correspond à ces filtres" />
            ) : (
              data.items.map((u) => (
                <Tr key={u.id} onClick={() => navigate(`/users/${u.id}`)}>
                  <Td className="max-w-[20rem]">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={u.name} seed={u.id} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800">
                          {u.name}
                          {u.isDemo && <span className="ml-2 text-[10px] font-bold uppercase text-slate-400">démo</span>}
                        </p>
                        <p className="truncate text-xs text-slate-500">@{u.username} · {contactLine(u)}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap">
                    <CountryFlag code={u.country} />{u.city || COUNTRIES[u.country] || u.country}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <span className="font-semibold">{u.level}</span>
                    <span className="ml-1.5 text-xs text-slate-500">{u.levelName}</span>
                  </Td>
                  <Td className="text-right font-semibold">{formatNumber(u.balance)}</Td>
                  <Td className="text-right text-slate-600">{formatNumber(u.xp)}</Td>
                  <Td className="text-center">{u.streak > 0 ? `🔥 ${u.streak}` : '—'}</Td>
                  <Td>
                    {u.status === 'active' ? <Badge tone="green">Actif</Badge> : <Badge tone="red">Suspendu</Badge>}
                  </Td>
                  <Td className="whitespace-nowrap text-slate-500">{timeAgo(u.lastActiveAt)}</Td>
                  <Td className="whitespace-nowrap text-slate-500">{timeAgo(u.createdAt)}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>

        {data && (
          <Pagination page={data.page} pages={data.pages} total={data.total} onPage={(p) => setFilters({ page: String(p) })} />
        )}
      </Card>
    </div>
  )
}

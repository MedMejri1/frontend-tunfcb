import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/form'
import { Pagination, Table, TableState, Td, Th, Tr } from '@/components/ui/table'
import { PageHeader } from '@/components/common'
import { api } from '@/lib/api'
import { useUrlFilters } from '@/lib/hooks'
import { TRANSACTION_TYPES } from '@/lib/labels'
import type { Paginated, Transaction, TransactionType, TypeTotal } from '@/lib/types'
import { cn, formatDateTime, formatNumber, formatPoints } from '@/lib/utils'

export function TransactionsPage() {
  const [filters, setFilters] = useUrlFilters({ type: '', user: '', from: '', to: '', page: '1' })

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () =>
      (
        await api.get<Paginated<Transaction> & { totals: TypeTotal[] }>('/admin/transactions', {
          params: {
            type: filters.type || undefined,
            user: filters.user || undefined,
            from: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : undefined,
            to: filters.to ? new Date(`${filters.to}T23:59:59`).toISOString() : undefined,
            page: Number(filters.page),
            limit: 30,
          },
        })
      ).data,
    placeholderData: keepPreviousData,
  })

  const userName = data?.items.find((t) => t.user?.id === filters.user)?.user?.name

  return (
    <div>
      <PageHeader title="Transactions" description="Chaque gain ou dépense de points, tous supporters confondus." />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <Select className="w-48" value={filters.type} onChange={(e) => setFilters({ type: e.target.value })}>
            <option value="">Tous les types</option>
            {(Object.keys(TRANSACTION_TYPES) as TransactionType[]).map((t) => (
              <option key={t} value={t}>
                {TRANSACTION_TYPES[t].label}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            Du
            <Input type="date" className="w-40" value={filters.from} onChange={(e) => setFilters({ from: e.target.value })} />
            au
            <Input type="date" className="w-40" value={filters.to} onChange={(e) => setFilters({ to: e.target.value })} />
          </div>
          {filters.user && (
            <Badge tone="blue" className="py-1">
              Supporter : {userName ?? filters.user.slice(-6)}
              <button className="cursor-pointer" onClick={() => setFilters({ user: '' })} aria-label="Retirer le filtre">
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          )}
          {(filters.type || filters.from || filters.to || filters.user) && (
            <Button variant="ghost" size="sm" onClick={() => setFilters({ type: '', from: '', to: '', user: '' })}>
              Réinitialiser
            </Button>
          )}
        </div>

        {data && data.totals.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3">
            {data.totals.map((t) => (
              <span key={t.type} className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
                <span className="font-semibold text-slate-600">{TRANSACTION_TYPES[t.type]?.label ?? t.type}</span>
                <span className={cn('ml-2 font-bold', t.points < 0 ? 'text-tunisia' : 'text-navy-900')}>
                  {formatPoints(t.points)} BP
                </span>
                <span className="ml-1 text-slate-400">({formatNumber(t.count)})</span>
              </span>
            ))}
          </div>
        )}

        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Supporter</Th>
              <Th>Type</Th>
              <Th>Libellé</Th>
              <Th className="text-right">Points</Th>
              <Th className="text-right">Solde après</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading || !data ? (
              <TableState colSpan={6} loading />
            ) : data.items.length === 0 ? (
              <TableState colSpan={6} empty="Aucune transaction pour ces filtres" />
            ) : (
              data.items.map((t) => (
                <Tr key={t.id}>
                  <Td className="whitespace-nowrap text-xs text-slate-500">{formatDateTime(t.createdAt)}</Td>
                  <Td>
                    {t.user ? (
                      <Link to={`/users/${t.user.id}`} className="font-semibold text-slate-800 hover:text-blau">
                        {t.user.name}
                        <span className="block text-xs font-normal text-slate-500">@{t.user.username}</span>
                      </Link>
                    ) : (
                      <span className="text-slate-400">Compte supprimé</span>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={TRANSACTION_TYPES[t.type]?.tone}>{TRANSACTION_TYPES[t.type]?.label ?? t.type}</Badge>
                  </Td>
                  <Td>
                    <p className="font-medium text-slate-800">{t.title}</p>
                    <p className="text-xs text-slate-500">
                      {t.detail}
                      {t.createdBy && <span className="ml-1 text-grana">· par {t.createdBy}</span>}
                    </p>
                  </Td>
                  <Td className={cn('text-right font-bold', t.points < 0 ? 'text-tunisia' : 'text-emerald-600')}>
                    {formatPoints(t.points)}
                  </Td>
                  <Td className="text-right text-slate-500">{formatNumber(t.balanceAfter)}</Td>
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

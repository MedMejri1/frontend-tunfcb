import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/form'
import { Pagination, Table, TableState, Td, Th, Tr } from '@/components/ui/table'
import { Tabs } from '@/components/ui/tabs'
import { PageHeader } from '@/components/common'
import { api } from '@/lib/api'
import { useDebounced, useUrlFilters } from '@/lib/hooks'
import { SUPPORT_CATEGORIES, SUPPORT_STATUS } from '@/lib/labels'
import type { Paginated, SupportStatus, SupportTicketSummary } from '@/lib/types'
import { cn, timeAgo } from '@/lib/utils'

const TABS: Array<'all' | SupportStatus> = ['open', 'answered', 'closed', 'all']

export function SupportPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useUrlFilters({ status: 'open', search: '', page: '1' })
  const search = useDebounced(filters.search)
  const page = Number(filters.page) || 1

  const tickets = useQuery({
    queryKey: ['support', 'list', { status: filters.status, search, page }],
    queryFn: async () =>
      (
        await api.get<Paginated<SupportTicketSummary> & { counts: Record<SupportStatus, number> }>('/admin/support', {
          params: { status: filters.status === 'all' ? undefined : filters.status, search: search || undefined, page, limit: 20 },
        })
      ).data,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  })
  const counts = tickets.data?.counts

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages des supporters"
        description="Demandes envoyées depuis l’app (menu › Contact). Ta réponse arrive dans l’app avec une notification."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <Tabs
            value={filters.status as 'all' | SupportStatus}
            onChange={(status) => setFilters({ status })}
            options={TABS.map((s) => ({
              value: s,
              label: s === 'all' ? 'Toutes' : SUPPORT_STATUS[s].label,
              count: s === 'all' ? undefined : counts?.[s],
            }))}
          />
          <div className="relative ml-auto w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="N°, sujet, nom ou email du supporter…"
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
            />
          </div>
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Demande</Th>
              <Th>Supporter</Th>
              <Th>Dernier message</Th>
              <Th>Statut</Th>
            </tr>
          </thead>
          <tbody>
            {tickets.isLoading ? (
              <TableState colSpan={4} loading />
            ) : !tickets.data?.items.length ? (
              <TableState colSpan={4} empty="Aucune demande ici" />
            ) : (
              tickets.data.items.map((t) => (
                <Tr key={t.id} onClick={() => navigate(`/support/${t.id}`)}>
                  <Td className="max-w-[22rem]">
                    <div className="flex items-start gap-2">
                      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', t.unread ? 'bg-blau' : 'bg-transparent')} />
                      <div className="min-w-0">
                        <p className={cn('truncate text-navy-900', t.unread ? 'font-extrabold' : 'font-semibold')}>{t.subject}</p>
                        <p className="text-xs text-slate-400">
                          {t.number} · {SUPPORT_CATEGORIES[t.category]}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <p className="font-semibold text-slate-800">{t.user?.name ?? 'Compte supprimé'}</p>
                    <p className="text-xs text-slate-400">{t.user?.email}</p>
                  </Td>
                  <Td className="max-w-[24rem]">
                    <p className="truncate text-sm text-slate-600">
                      {t.lastMessage?.from === 'admin' && <span className="font-semibold text-slate-400">Vous : </span>}
                      {t.lastMessage?.body}
                    </p>
                    <p className="text-xs text-slate-400">{timeAgo(t.lastMessageAt)}</p>
                  </Td>
                  <Td>
                    <Badge tone={SUPPORT_STATUS[t.status].tone}>{SUPPORT_STATUS[t.status].label}</Badge>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
        {tickets.data && tickets.data.pages > 1 && (
          <Pagination page={page} pages={tickets.data.pages} total={tickets.data.total} onPage={(p) => setFilters({ page: String(p) })} />
        )}
      </Card>
    </div>
  )
}

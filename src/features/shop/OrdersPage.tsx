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
import { ORDER_STATUS } from '@/lib/labels'
import type { OrderListItem, OrderStatus, Paginated } from '@/lib/types'
import { formatDateTime, formatDt } from '@/lib/utils'
import { useShopSummary } from './api'

const STATUS_TABS: Array<'all' | OrderStatus> = ['all', 'pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled']

export function OrdersPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useUrlFilters({ status: 'all', search: '', page: '1' })
  const search = useDebounced(filters.search)
  const page = Number(filters.page) || 1
  const summary = useShopSummary()
  const byStatus = summary.data?.ordersByStatus

  const orders = useQuery({
    queryKey: ['shop', 'orders', { status: filters.status, search, page }],
    queryFn: async () =>
      (
        await api.get<Paginated<OrderListItem>>('/admin/shop/orders', {
          params: { status: filters.status === 'all' ? undefined : filters.status, search: search || undefined, page, limit: 20 },
        })
      ).data,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })

  const total = byStatus ? Object.values(byStatus).reduce((sum, n) => sum + n, 0) : undefined

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boutique · Commandes"
        description="Confirme, prépare et expédie les commandes : chaque étape est notifiée au supporter dans l’app."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="max-w-full overflow-x-auto">
            <Tabs
              value={filters.status as 'all' | OrderStatus}
              onChange={(status) => setFilters({ status })}
              options={STATUS_TABS.map((s) => ({
                value: s,
                label: s === 'all' ? 'Toutes' : ORDER_STATUS[s].label,
                count: s === 'all' ? total : byStatus?.[s],
              }))}
            />
          </div>
          <div className="relative ml-auto w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="N° de commande, nom, téléphone…"
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
            />
          </div>
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Commande</Th>
              <Th>Client</Th>
              <Th>Gouvernorat</Th>
              <Th className="text-right">Articles</Th>
              <Th className="text-right">Total</Th>
              <Th>Statut</Th>
            </tr>
          </thead>
          <tbody>
            {orders.isLoading ? (
              <TableState colSpan={6} loading />
            ) : !orders.data?.items.length ? (
              <TableState colSpan={6} empty="Aucune commande pour le moment" />
            ) : (
              orders.data.items.map((o) => (
                <Tr key={o.id} onClick={() => navigate(`/shop/orders/${o.id}`)}>
                  <Td>
                    <p className="font-bold text-navy-900">{o.number}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(o.createdAt)}</p>
                  </Td>
                  <Td>
                    <p className="font-semibold text-slate-800">{o.customer.name}</p>
                    <p className="text-xs text-slate-400">{o.customer.phone}</p>
                  </Td>
                  <Td>{o.customer.governorate}</Td>
                  <Td className="text-right">{o.itemsCount}</Td>
                  <Td className="text-right font-semibold">{formatDt(o.total)}</Td>
                  <Td>
                    <Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
        {orders.data && orders.data.pages > 1 && (
          <Pagination page={page} pages={orders.data.pages} total={orders.data.total} onPage={(p) => setFilters({ page: String(p) })} />
        )}
      </Card>
    </div>
  )
}

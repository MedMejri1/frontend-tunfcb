import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Archive, Banknote, Eye, EyeOff, ImageOff, Package, Pencil, Plus, Search, ShoppingBag, Star, Trash2, Truck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/form'
import { Pagination, Table, TableState, Td, Th, Tr } from '@/components/ui/table'
import { Tabs } from '@/components/ui/tabs'
import { ConfirmDialog, PageHeader, StatCard } from '@/components/common'
import { api, apiErrorMessage, assetUrl } from '@/lib/api'
import { useDebounced } from '@/lib/hooks'
import { PRODUCT_CATEGORIES, PRODUCT_STATUS } from '@/lib/labels'
import type { Paginated, Product, ProductStatus } from '@/lib/types'
import { cn, formatDt, formatNumber } from '@/lib/utils'
import { ProductDialog } from './ProductDialog'
import { useShopSummary } from './api'
import { ShopSettingsCard } from './ShopSettingsCard'

type StatusFilter = 'all' | ProductStatus

export function ProductsPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState<StatusFilter>('all')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debounced = useDebounced(search)
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)

  const summary = useShopSummary()
  const products = useQuery({
    queryKey: ['shop', 'products', { status, category, debounced, page }],
    queryFn: async () =>
      (
        await api.get<Paginated<Product> & { counts: Record<ProductStatus, number> }>('/admin/shop/products', {
          params: {
            status: status === 'all' ? undefined : status,
            category: category || undefined,
            search: debounced || undefined,
            page,
            limit: 15,
          },
        })
      ).data,
    placeholderData: keepPreviousData,
  })

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Product> }) => api.patch(`/admin/shop/products/${id}`, body),
    onSuccess: (_res, { body }) => {
      toast.success(body.status === 'published' ? 'Article publié dans l’app' : 'Article retiré de la boutique')
      qc.invalidateQueries({ queryKey: ['shop'] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete<{ archived: boolean }>(`/admin/shop/products/${id}`),
    onSuccess: ({ data }) => {
      toast.success(data.archived ? 'Article déjà commandé : archivé plutôt que supprimé' : 'Article supprimé')
      qc.invalidateQueries({ queryKey: ['shop'] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const s = summary.data
  const counts = products.data?.counts
  const toProcess = s ? s.ordersByStatus.pending + s.ordersByStatus.confirmed + s.ordersByStatus.preparing : undefined

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boutique · Articles"
        description="Les articles publiés apparaissent dans la boutique de l’app. Les prix sont en dinars, paiement à la livraison."
        actions={
          <Button variant="primary" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> Nouvel article
          </Button>
        }
      />

      {s && <ShopSettingsCard shop={s.shop} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Articles publiés" value={s?.publishedProducts ?? '—'} hint={`${counts?.draft ?? 0} brouillon(s)`} icon={Package} />
        <StatCard label="Commandes ce mois" value={s?.monthOrders ?? '—'} hint="Hors annulées" icon={ShoppingBag} tone="gold" />
        <StatCard label="À traiter" value={toProcess ?? '—'} hint="En attente, confirmées, en préparation" icon={Truck} tone="grana" />
        <StatCard label="Chiffre d’affaires" value={s ? formatDt(s.deliveredRevenue) : '—'} hint="Commandes livrées" icon={Banknote} tone="green" />
      </div>

      {!!s?.lowStock.length && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-bold">Stock faible : </span>
          {s.lowStock.map((p) => `${p.name} (${p.stock})`).join(' · ')}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <Tabs
            value={status}
            onChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
            options={[
              { value: 'all', label: 'Tous' },
              { value: 'published', label: 'Publiés', count: counts?.published },
              { value: 'draft', label: 'Brouillons', count: counts?.draft },
              { value: 'archived', label: 'Archivés', count: counts?.archived },
            ]}
          />
          <Select
            className="w-44"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Toutes les catégories</option>
            {Object.entries(PRODUCT_CATEGORIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Rechercher un article…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Article</Th>
              <Th>Catégorie</Th>
              <Th className="text-right">Prix</Th>
              <Th className="text-right">Stock</Th>
              <Th className="text-right">Vendus</Th>
              <Th>Statut</Th>
              <Th className="w-36" />
            </tr>
          </thead>
          <tbody>
            {products.isLoading ? (
              <TableState colSpan={7} loading />
            ) : !products.data?.items.length ? (
              <TableState
                colSpan={7}
                empty={
                  <span>
                    Aucun article pour le moment.{' '}
                    <button type="button" className="cursor-pointer font-semibold text-blau" onClick={() => setEditing('new')}>
                      Ajouter le premier
                    </button>
                  </span>
                }
              />
            ) : (
              products.data.items.map((p) => (
                <Tr key={p.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        {p.images[0] ? (
                          <img src={assetUrl(p.images[0])} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImageOff className="h-5 w-5 text-slate-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-semibold text-navy-900">
                          {p.featured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                          <span className="truncate">{p.name}</span>
                        </p>
                        <p className="text-xs text-slate-400">{p.sizes.length ? p.sizes.join(' · ') : 'Taille unique'}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>{PRODUCT_CATEGORIES[p.category]}</Td>
                  <Td className="text-right font-semibold">{formatDt(p.price)}</Td>
                  <Td
                    className={cn(
                      'text-right font-semibold',
                      p.stock === 0 ? 'text-tunisia' : p.stock != null && p.stock <= 3 ? 'text-amber-600' : '',
                    )}
                  >
                    {p.stock == null ? '∞' : p.stock === 0 ? 'Rupture' : formatNumber(p.stock)}
                  </Td>
                  <Td className="text-right">{formatNumber(p.sold)}</Td>
                  <Td>
                    <Badge tone={PRODUCT_STATUS[p.status].tone}>{PRODUCT_STATUS[p.status].label}</Badge>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      {p.status === 'published' ? (
                        <Button variant="ghost" size="icon" title="Retirer de la boutique" onClick={() => patch.mutate({ id: p.id, body: { status: 'draft' } })}>
                          <EyeOff className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" title="Publier" className="text-emerald-600" onClick={() => patch.mutate({ id: p.id, body: { status: 'published' } })}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Modifier" onClick={() => setEditing(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title={p.status === 'archived' ? 'Supprimer' : 'Supprimer / archiver'} className="text-tunisia" onClick={() => setDeleting(p)}>
                        {p.status === 'archived' ? <Trash2 className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
        {products.data && products.data.pages > 1 && (
          <Pagination page={page} pages={products.data.pages} total={products.data.total} onPage={setPage} />
        )}
      </Card>

      <p className="text-xs text-slate-400">
        Les commandes se gèrent dans <Link to="/shop/orders" className="font-semibold text-blau">Boutique · Commandes</Link>.
      </p>

      {editing && <ProductDialog product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Supprimer cet article ?"
        description={
          <>
            « {deleting?.name} » sera retiré de la boutique. S’il a déjà été commandé, il est archivé pour garder
            l’historique des commandes.
          </>
        }
        confirmLabel="Supprimer"
        danger
        onConfirm={() => deleting && remove.mutateAsync(deleting.id)}
      />
    </div>
  )
}

import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, MapPin, Pencil, Phone, Plus, Search, Trash2, Undo2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/form'
import { Pagination, Table, TableState, Td, Th, Tr } from '@/components/ui/table'
import { Tabs } from '@/components/ui/tabs'
import { ConfirmDialog, PageHeader } from '@/components/common'
import { api, apiErrorMessage } from '@/lib/api'
import { useDebounced, useUrlFilters } from '@/lib/hooks'
import { CAFE_AMENITIES, CAFE_STATUS } from '@/lib/labels'
import type { Cafe, CafeAmenity, CafeStatus, Paginated } from '@/lib/types'
import { cn, timeAgo } from '@/lib/utils'
import { useTnLocations } from './api'

const TABS: Array<'all' | CafeStatus> = ['pending', 'approved', 'rejected', 'all']

const REJECT_REASONS = ['Numéro injoignable', 'Café introuvable à cette adresse', 'Ne diffuse pas les matchs', 'Déjà inscrit']

/** 22123456 → 22 123 456 */
const formatPhone = (phone: string) => phone.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1 $2 $3')

export function CafesPage() {
  const qc = useQueryClient()
  const [filters, setFilters] = useUrlFilters({ status: 'pending', governorate: '', search: '', page: '1' })
  const search = useDebounced(filters.search)
  const page = Number(filters.page) || 1
  const [editing, setEditing] = useState<Cafe | 'new' | null>(null)
  const [rejecting, setRejecting] = useState<Cafe | null>(null)
  const [deleting, setDeleting] = useState<Cafe | null>(null)
  const locations = useTnLocations()

  const cafes = useQuery({
    queryKey: ['cafes', 'list', { status: filters.status, governorate: filters.governorate, search, page }],
    queryFn: async () =>
      (
        await api.get<Paginated<Cafe> & { counts: Record<CafeStatus, number> }>('/admin/cafes', {
          params: {
            status: filters.status === 'all' ? undefined : filters.status,
            governorate: filters.governorate || undefined,
            search: search || undefined,
            page,
            limit: 20,
          },
        })
      ).data,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })
  const counts = cafes.data?.counts

  const refresh = () => qc.invalidateQueries({ queryKey: ['cafes'] })

  const setStatus = useMutation({
    mutationFn: ({ cafe, status, reason }: { cafe: Cafe; status: CafeStatus; reason?: string }) =>
      api.post(`/admin/cafes/${cafe.id}/status`, { status, reason }),
    onSuccess: (_res, { cafe, status }) => {
      const told = cafe.submittedBy ? ' · le supporter est prévenu' : ''
      toast.success(status === 'approved' ? `Café publié dans l’app${told}` : `Café retiré de l’app${told}`)
      refresh()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/cafes/${id}`),
    onSuccess: () => {
      toast.success('Café supprimé')
      refresh()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cafés"
        description="Cafés qui diffusent les matchs, affichés gratuitement dans l’app (menu › Où regarder le match). Les gérants s’inscrivent depuis l’app : appelle-les pour vérifier, puis publie."
        actions={
          <Button variant="primary" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> Ajouter un café
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <Tabs
            value={filters.status as 'all' | CafeStatus}
            onChange={(status) => setFilters({ status })}
            options={TABS.map((s) => ({
              value: s,
              label: s === 'all' ? 'Tous' : CAFE_STATUS[s].label,
              count: s === 'all' ? undefined : counts?.[s],
            }))}
          />
          <Select
            className="w-full sm:w-52"
            value={filters.governorate}
            onChange={(e) => setFilters({ governorate: e.target.value })}
            aria-label="Gouvernorat"
          >
            <option value="">Tous les gouvernorats</option>
            {locations.data?.map((g) => (
              <option key={g.value} value={g.value}>
                {g.name}
              </option>
            ))}
          </Select>
          <div className="relative ml-auto w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Café, gérant, téléphone, ville…"
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
            />
          </div>
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Café</Th>
              <Th>Ville</Th>
              <Th>Gérant</Th>
              <Th>Reçu</Th>
              <Th>Statut</Th>
              <Th className="w-56" />
            </tr>
          </thead>
          <tbody>
            {cafes.isLoading ? (
              <TableState colSpan={6} loading />
            ) : !cafes.data?.items.length ? (
              <TableState colSpan={6} empty={filters.status === 'pending' ? 'Aucune demande à vérifier' : 'Aucun café ici'} />
            ) : (
              cafes.data.items.map((c) => (
                <Tr key={c.id}>
                  <Td className="max-w-[20rem]">
                    <p className="truncate font-semibold text-navy-900">{c.name}</p>
                    <p className="truncate text-xs text-slate-500">{c.address}</p>
                    <p className="truncate text-xs text-slate-400">
                      {[c.screens ? `${c.screens} écran${c.screens > 1 ? 's' : ''}` : null, ...c.amenities.map((a) => CAFE_AMENITIES[a])]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </Td>
                  <Td>
                    <p className="font-medium text-slate-800">{c.delegationName}</p>
                    <p className="text-xs text-slate-400">{c.governorateName}</p>
                    {c.mapsUrl && (
                      <a href={c.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blau hover:underline">
                        <MapPin className="h-3 w-3" /> Carte
                      </a>
                    )}
                  </Td>
                  <Td>
                    <p className="font-medium text-slate-800">{c.managerName}</p>
                    <a href={`tel:+216${c.phone}`} className="inline-flex items-center gap-1 text-xs font-semibold text-blau hover:underline">
                      <Phone className="h-3 w-3" /> +216 {formatPhone(c.phone)}
                    </a>
                    {!c.showPhone && <p className="text-[11px] text-slate-400">Numéro masqué dans l’app</p>}
                  </Td>
                  <Td className="text-xs text-slate-500">
                    <p>{timeAgo(c.createdAt)}</p>
                    <p className="text-slate-400">{c.submittedBy ? c.submittedBy.name : 'Invité / équipe'}</p>
                  </Td>
                  <Td className="max-w-[14rem]">
                    <Badge tone={CAFE_STATUS[c.status].tone}>{CAFE_STATUS[c.status].label}</Badge>
                    {c.status === 'rejected' && c.rejectionReason && (
                      <p className="mt-1 truncate text-xs text-slate-400" title={c.rejectionReason}>
                        {c.rejectionReason}
                      </p>
                    )}
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      {c.status !== 'approved' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-700"
                          disabled={setStatus.isPending}
                          onClick={() => setStatus.mutate({ cafe: c, status: 'approved' })}
                        >
                          <Check className="h-4 w-4" /> Publier
                        </Button>
                      )}
                      {c.status === 'pending' && (
                        <Button variant="ghost" size="sm" className="text-tunisia" onClick={() => setRejecting(c)}>
                          <X className="h-4 w-4" /> Refuser
                        </Button>
                      )}
                      {c.status === 'approved' && (
                        <Button variant="ghost" size="sm" onClick={() => setRejecting(c)}>
                          <Undo2 className="h-4 w-4" /> Retirer
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Modifier" onClick={() => setEditing(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Supprimer" className="text-tunisia" onClick={() => setDeleting(c)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
        {cafes.data && cafes.data.pages > 1 && (
          <Pagination page={page} pages={cafes.data.pages} total={cafes.data.total} onPage={(p) => setFilters({ page: String(p) })} />
        )}
      </Card>

      {editing && <CafeDialog cafe={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {rejecting && (
        <RejectDialog
          cafe={rejecting}
          loading={setStatus.isPending}
          onClose={() => setRejecting(null)}
          onConfirm={(reason) =>
            setStatus.mutate({ cafe: rejecting, status: 'rejected', reason }, { onSuccess: () => setRejecting(null) })
          }
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Supprimer ce café ?"
        description={<>{deleting?.name} sera supprimé définitivement (sans notification au gérant).</>}
        confirmLabel="Supprimer"
        danger
        onConfirm={() => deleting && remove.mutateAsync(deleting.id)}
      />
    </div>
  )
}

function RejectDialog({
  cafe,
  loading,
  onClose,
  onConfirm,
}: {
  cafe: Cafe
  loading: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const published = cafe.status === 'approved'

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={published ? `Retirer ${cafe.name} de l’app ?` : `Refuser ${cafe.name} ?`}
      description={cafe.submittedBy ? 'Le supporter qui l’a inscrit reçoit une notification avec ce motif.' : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="danger" loading={loading} onClick={() => onConfirm(reason.trim())}>
            {published ? 'Retirer' : 'Refuser'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {REJECT_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={cn(
                'cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold',
                reason === r ? 'border-blau bg-blue-50 text-blau' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <Field label="Motif (optionnel)">
          <Textarea rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  )
}

function CafeDialog({ cafe, onClose }: { cafe: Cafe | null; onClose: () => void }) {
  const qc = useQueryClient()
  const locations = useTnLocations()
  const [form, setForm] = useState({
    name: cafe?.name ?? '',
    governorate: cafe?.governorate ?? '',
    delegation: cafe?.delegation ?? '',
    address: cafe?.address ?? '',
    mapsUrl: cafe?.mapsUrl ?? '',
    screens: cafe?.screens ? String(cafe.screens) : '',
    amenities: cafe?.amenities ?? ([] as CafeAmenity[]),
    description: cafe?.description ?? '',
    managerName: cafe?.managerName ?? '',
    phone: cafe?.phone ?? '',
    showPhone: cafe?.showPhone ?? true,
  })
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))
  const delegations = locations.data?.find((g) => g.value === form.governorate)?.delegations ?? []

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        ...form,
        name: form.name.trim(),
        address: form.address.trim(),
        mapsUrl: form.mapsUrl.trim(),
        description: form.description.trim(),
        managerName: form.managerName.trim(),
        screens: form.screens ? Number(form.screens) : null,
      }
      if (cafe) await api.patch(`/admin/cafes/${cafe.id}`, body)
      else await api.post('/admin/cafes', body)
    },
    onSuccess: () => {
      toast.success(cafe ? 'Café mis à jour' : 'Café ajouté · visible dans l’app')
      qc.invalidateQueries({ queryKey: ['cafes'] })
      onClose()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const valid =
    form.name.trim().length >= 2 &&
    form.governorate &&
    form.delegation &&
    form.address.trim().length >= 5 &&
    form.managerName.trim().length >= 2 &&
    form.phone.trim().length >= 8

  return (
    <Dialog
      open
      size="lg"
      onOpenChange={(open) => !open && onClose()}
      title={cafe ? cafe.name : 'Ajouter un café'}
      description={cafe ? undefined : 'Un café ajouté par l’équipe est publié directement.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" disabled={!valid} loading={save.isPending} onClick={() => save.mutate()}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nom du café">
          <Input value={form.name} maxLength={80} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Gouvernorat" hint={locations.isError ? 'Liste des villes indisponible, réessaie' : undefined}>
            <Select
              value={form.governorate}
              disabled={locations.isLoading}
              onChange={(e) => setForm((f) => ({ ...f, governorate: e.target.value, delegation: '' }))}
            >
              <option value="">{locations.isLoading ? 'Chargement…' : 'Choisir'}</option>
              {locations.data?.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Délégation">
            <Select value={form.delegation} disabled={!delegations.length} onChange={(e) => set('delegation', e.target.value)}>
              <option value="">Choisir</option>
              {delegations.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Adresse" hint="Rue, repère (ex. : en face de la poste)">
          <Input value={form.address} maxLength={160} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
          <Field label="Lien Google Maps (optionnel)">
            <Input value={form.mapsUrl} placeholder="https://maps.app.goo.gl/…" onChange={(e) => set('mapsUrl', e.target.value)} />
          </Field>
          <Field label="Écrans (optionnel)">
            <Input type="number" min={1} max={50} value={form.screens} onChange={(e) => set('screens', e.target.value)} />
          </Field>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Équipements</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CAFE_AMENITIES) as CafeAmenity[]).map((a) => {
              const on = form.amenities.includes(a)
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => set('amenities', on ? form.amenities.filter((x) => x !== a) : [...form.amenities, a])}
                  className={cn(
                    'cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold',
                    on ? 'border-blau bg-blue-50 text-blau' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {CAFE_AMENITIES[a]}
                </button>
              )
            })}
          </div>
        </div>
        <Field label="Description (optionnel)">
          <Textarea rows={2} maxLength={300} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom du gérant">
            <Input value={form.managerName} maxLength={80} onChange={(e) => set('managerName', e.target.value)} />
          </Field>
          <Field label="Téléphone" hint="8 chiffres">
            <Input value={form.phone} inputMode="tel" onChange={(e) => set('phone', e.target.value)} />
          </Field>
        </div>
        <Switch checked={form.showPhone} onChange={(v) => set('showPhone', v)} label="Afficher le numéro dans l’app" />
      </div>
    </Dialog>
  )
}

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Banknote, ImageOff, Loader2, MapPin, Phone, StickyNote, Truck, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/form'
import { api, apiErrorMessage, assetUrl } from '@/lib/api'
import { ORDER_STATUS } from '@/lib/labels'
import type { OrderDetail, OrderStatus, OrderTracking } from '@/lib/types'
import { cn, formatDateTime, formatDt, contactLine } from '@/lib/utils'

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [nextStatus, setNextStatus] = useState<OrderStatus | null>(null)

  const query = useQuery({
    queryKey: ['shop', 'order', id],
    queryFn: async () => (await api.get<{ order: OrderDetail }>(`/admin/shop/orders/${id}`)).data.order,
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['shop'] })

  if (query.isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blau" />
      </div>
    )
  }
  if (!query.data) return <p className="text-sm text-slate-500">Commande introuvable.</p>
  const order = query.data

  return (
    <div className="space-y-6">
      <Link to="/shop/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" /> Commandes
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-navy-900">{order.number}</h1>
            <Badge tone={ORDER_STATUS[order.status].tone}>{ORDER_STATUS[order.status].label}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">Passée le {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.nextStatuses.map((s) => (
            <Button key={s} variant={s === 'cancelled' ? 'outline' : 'primary'} className={cn(s === 'cancelled' && 'text-tunisia')} onClick={() => setNextStatus(s)}>
              {ORDER_STATUS[s].action}
            </Button>
          ))}
        </div>
      </div>

      {order.status === 'cancelled' && order.cancelReason && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-tunisia">
          <span className="font-bold">Motif d’annulation : </span>
          {order.cancelReason}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Articles" description={`${order.items.reduce((n, i) => n + i.quantity, 0)} article(s)`} />
            <CardContent className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {item.image ? <img src={assetUrl(item.image)} alt="" className="h-full w-full object-cover" /> : <ImageOff className="h-5 w-5 text-slate-300" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy-900">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.size ? `Taille ${item.size} · ` : ''}
                      {item.quantity} × {formatDt(item.unitPrice)}
                    </p>
                  </div>
                  <p className="font-bold text-navy-900">{formatDt(item.lineTotal)}</p>
                </div>
              ))}
              <div className="space-y-1.5 border-t border-slate-100 pt-3 text-sm">
                <Row label="Sous-total" value={formatDt(order.subtotal)} />
                <Row label="Livraison" value={order.shippingFee ? formatDt(order.shippingFee) : 'Gratuite'} />
                <Row label="Total à encaisser" value={formatDt(order.total)} strong />
                <p className="flex items-center gap-1.5 pt-1 text-xs text-slate-500">
                  <Banknote className="h-3.5 w-3.5" /> Paiement en espèces à la livraison
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Historique" description="Chaque changement est notifié au supporter dans l’app" />
            <CardContent>
              <ol className="relative space-y-5 border-l-2 border-slate-100 pl-6">
                {[...order.history].reverse().map((h, i) => (
                  <li key={i} className="relative">
                    <span
                      className={cn(
                        'absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white',
                        h.status === 'cancelled' ? 'bg-tunisia' : i === 0 ? 'bg-blau' : 'bg-slate-300',
                      )}
                    />
                    <p className="text-sm font-semibold text-navy-900">{ORDER_STATUS[h.status].label}</p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(h.at)} · {h.by === 'user' ? 'par le client' : `par ${h.adminName ?? 'un administrateur'}`}
                    </p>
                    {h.note && <p className="mt-1 text-sm text-slate-600">« {h.note} »</p>}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Livraison" />
            <CardContent className="space-y-3 text-sm">
              <p className="flex items-start gap-2 font-semibold text-navy-900">
                <UserRound className="mt-0.5 h-4 w-4 text-slate-400" /> {order.shipping.fullName}
              </p>
              <a href={`tel:+216${order.shipping.phone}`} className="flex items-start gap-2 font-semibold text-blau">
                <Phone className="mt-0.5 h-4 w-4" /> +216 {order.shipping.phone}
              </a>
              <p className="flex items-start gap-2 text-slate-700">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>
                  {order.shipping.address}
                  <br />
                  {order.shipping.city}, {order.shipping.governorate}
                </span>
              </p>
              {order.shipping.note && (
                <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-amber-800">
                  <StickyNote className="mt-0.5 h-4 w-4 shrink-0" /> {order.shipping.note}
                </p>
              )}
              {order.user && (
                <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                  Compte :{' '}
                  <Link to={`/users/${order.user.id}`} className="font-semibold text-blau">
                    {order.user.name}
                  </Link>{' '}
                  · {contactLine(order.user)}
                </p>
              )}
            </CardContent>
          </Card>

          <TrackingCard order={order} onSaved={refresh} />
          <AdminNoteCard order={order} onSaved={refresh} />
        </div>
      </div>

      {nextStatus && <StatusDialog order={order} status={nextStatus} onClose={() => setNextStatus(null)} onDone={refresh} />}
    </div>
  )
}

const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className={cn('flex justify-between', strong ? 'text-base font-extrabold text-navy-900' : 'text-slate-600')}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
)

function StatusDialog({ order, status, onClose, onDone }: { order: OrderDetail; status: OrderStatus; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState('')
  const [tracking, setTracking] = useState<OrderTracking>(order.tracking ?? {})
  const cancelling = status === 'cancelled'

  const save = useMutation({
    mutationFn: () =>
      api.post(`/admin/shop/orders/${order.id}/status`, {
        status,
        note: note.trim() || undefined,
        tracking: status === 'shipped' ? tracking : undefined,
      }),
    onSuccess: () => {
      toast.success(`Commande ${ORDER_STATUS[status].label.toLowerCase()} · le supporter est notifié`)
      onDone()
      onClose()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`${ORDER_STATUS[status].action} ${order.number} ?`}
      description={cancelling ? 'Les articles retournent en stock et le supporter est prévenu.' : 'Le supporter reçoit une notification dans l’app.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Retour
          </Button>
          <Button variant={cancelling ? 'danger' : 'primary'} loading={save.isPending} disabled={cancelling && !note.trim()} onClick={() => save.mutate()}>
            {ORDER_STATUS[status].action}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {status === 'shipped' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Transporteur">
              <Input value={tracking.carrier ?? ''} placeholder="Aramex, Rapid-Poste…" onChange={(e) => setTracking({ ...tracking, carrier: e.target.value })} />
            </Field>
            <Field label="N° de suivi">
              <Input value={tracking.trackingNumber ?? ''} onChange={(e) => setTracking({ ...tracking, trackingNumber: e.target.value })} />
            </Field>
            <Field label="Lien de suivi (optionnel)" className="sm:col-span-2">
              <Input value={tracking.trackingUrl ?? ''} placeholder="https://…" onChange={(e) => setTracking({ ...tracking, trackingUrl: e.target.value })} />
            </Field>
          </div>
        )}
        <Field label={cancelling ? 'Motif (visible par le supporter)' : 'Message au supporter (optionnel)'}>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={cancelling ? 'Article en rupture, client injoignable…' : ''} />
        </Field>
      </div>
    </Dialog>
  )
}

function TrackingCard({ order, onSaved }: { order: OrderDetail; onSaved: () => void }) {
  const [draft, setDraft] = useState<OrderTracking | null>(null)
  const tracking = draft ?? order.tracking ?? {}
  const save = useMutation({
    mutationFn: () => api.patch(`/admin/shop/orders/${order.id}`, { tracking }),
    onSuccess: () => {
      toast.success('Suivi mis à jour')
      setDraft(null)
      onSaved()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })
  return (
    <Card>
      <CardHeader title="Suivi du colis" description="Visible par le supporter dans l’app" action={<Truck className="h-5 w-5 text-slate-300" />} />
      <CardContent className="space-y-3">
        <Field label="Transporteur">
          <Input value={tracking.carrier ?? ''} onChange={(e) => setDraft({ ...tracking, carrier: e.target.value })} />
        </Field>
        <Field label="N° de suivi">
          <Input value={tracking.trackingNumber ?? ''} onChange={(e) => setDraft({ ...tracking, trackingNumber: e.target.value })} />
        </Field>
        <Field label="Lien de suivi">
          <Input value={tracking.trackingUrl ?? ''} placeholder="https://…" onChange={(e) => setDraft({ ...tracking, trackingUrl: e.target.value })} />
        </Field>
        {draft && (
          <Button variant="primary" size="sm" loading={save.isPending} onClick={() => save.mutate()}>
            Enregistrer le suivi
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function AdminNoteCard({ order, onSaved }: { order: OrderDetail; onSaved: () => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: () => api.patch(`/admin/shop/orders/${order.id}`, { adminNote: draft ?? '' }),
    onSuccess: () => {
      toast.success('Note enregistrée')
      setDraft(null)
      onSaved()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })
  return (
    <Card>
      <CardHeader title="Note interne" description="Jamais visible dans l’app" />
      <CardContent className="space-y-3">
        <Textarea rows={3} value={draft ?? order.adminNote} placeholder="Appelé le client, livraison le samedi…" onChange={(e) => setDraft(e.target.value)} />
        {draft !== null && (
          <Button variant="primary" size="sm" loading={save.isPending} onClick={() => save.mutate()}>
            Enregistrer la note
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Lock, LockOpen, Send, ShoppingBag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Textarea } from '@/components/ui/form'
import { UserAvatar } from '@/components/common'
import { Logo } from '@/components/common/Logo'
import { api, apiErrorMessage } from '@/lib/api'
import { ORDER_STATUS, SUPPORT_CATEGORIES, SUPPORT_STATUS } from '@/lib/labels'
import type { SupportTicketDetail } from '@/lib/types'
import { cn, formatDate, formatDateTime, formatDt } from '@/lib/utils'

export function SupportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [reply, setReply] = useState('')
  const bottom = useRef<HTMLDivElement>(null)

  const query = useQuery({
    queryKey: ['support', 'ticket', id],
    queryFn: async () => (await api.get<{ ticket: SupportTicketDetail }>(`/admin/support/${id}`)).data.ticket,
    refetchInterval: 30_000,
  })
  const ticket = query.data
  const messagesCount = ticket?.messages.length ?? 0

  // Opening the request marks it as read: refresh the list and the sidebar badge.
  useEffect(() => {
    if (ticket) void qc.invalidateQueries({ queryKey: ['support', 'summary'] })
  }, [ticket, qc])
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [messagesCount])

  const refresh = () => qc.invalidateQueries({ queryKey: ['support'] })

  const send = useMutation({
    mutationFn: () => api.post(`/admin/support/${id}/messages`, { body: reply.trim() }),
    onSuccess: () => {
      toast.success('Réponse envoyée · le supporter est notifié dans l’app')
      setReply('')
      refresh()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const setStatus = useMutation({
    mutationFn: (status: 'open' | 'closed') => api.post(`/admin/support/${id}/status`, { status }),
    onSuccess: (_res, status) => {
      toast.success(status === 'closed' ? 'Demande fermée' : 'Demande rouverte')
      refresh()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  if (query.isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blau" />
      </div>
    )
  }
  if (!ticket) return <p className="text-sm text-slate-500">Demande introuvable.</p>

  return (
    <div className="space-y-6">
      <Link to="/support" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" /> Messages
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-navy-900">{ticket.subject}</h1>
            <Badge tone={SUPPORT_STATUS[ticket.status].tone}>{SUPPORT_STATUS[ticket.status].label}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {ticket.number} · {SUPPORT_CATEGORIES[ticket.category]} · ouverte le {formatDateTime(ticket.createdAt)}
          </p>
        </div>
        {ticket.status === 'closed' ? (
          <Button variant="outline" loading={setStatus.isPending} onClick={() => setStatus.mutate('open')}>
            <LockOpen className="h-4 w-4" /> Rouvrir
          </Button>
        ) : (
          <Button variant="outline" loading={setStatus.isPending} onClick={() => setStatus.mutate('closed')}>
            <Lock className="h-4 w-4" /> Fermer la demande
          </Button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="flex flex-col xl:col-span-2">
          <div className="max-h-[60vh] min-h-64 space-y-4 overflow-y-auto bg-slate-50/60 p-5">
            {ticket.messages.map((m, i) => {
              const mine = m.from === 'admin'
              return (
                <div key={i} className={cn('flex items-end gap-2', mine && 'flex-row-reverse')}>
                  {mine ? (
                    <Logo className="h-8 w-8 shrink-0" />
                  ) : (
                    <UserAvatar name={ticket.user?.name ?? '?'} seed={ticket.user?.id} size="sm" />
                  )}
                  <div className={cn('max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm', mine ? 'rounded-br-sm bg-blau text-white' : 'rounded-bl-sm bg-white text-slate-800')}>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                    <p className={cn('mt-1 text-[11px]', mine ? 'text-white/70' : 'text-slate-400')}>
                      {mine ? `${m.adminName ?? 'Équipe Tunfcb'} · ` : ''}
                      {formatDateTime(m.at)}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={bottom} />
          </div>
          <div className="border-t border-slate-100 p-4">
            <Textarea
              rows={3}
              value={reply}
              placeholder="Écris ta réponse… (Ctrl + Entrée pour envoyer)"
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && reply.trim().length >= 2) send.mutate()
              }}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                {ticket.status === 'closed' ? 'Répondre rouvre la conversation pour le supporter.' : 'Le supporter reçoit une notification dans l’app.'}
              </p>
              <Button variant="primary" disabled={reply.trim().length < 2} loading={send.isPending} onClick={() => send.mutate()}>
                <Send className="h-4 w-4" /> Envoyer
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Supporter" />
            <CardContent>
              {ticket.user ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={ticket.user.name} seed={ticket.user.id} />
                    <div className="min-w-0">
                      <Link to={`/users/${ticket.user.id}`} className="font-bold text-blau">
                        {ticket.user.name}
                      </Link>
                      <p className="truncate text-xs text-slate-500">@{ticket.user.username}</p>
                    </div>
                  </div>
                  <p className="text-slate-600">{ticket.user.email}</p>
                  <p className="text-xs text-slate-400">
                    Membre depuis le {formatDate(ticket.user.memberSince)} · {ticket.user.ticketsCount} demande(s)
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Compte supprimé.</p>
              )}
            </CardContent>
          </Card>

          {ticket.order && (
            <Card>
              <CardHeader title="Commande concernée" />
              <CardContent>
                <Link to={`/shop/orders/${ticket.order.id}`} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                  <ShoppingBag className="h-5 w-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="font-bold text-navy-900">{ticket.order.number}</p>
                    <p className="text-xs text-slate-500">{formatDt(ticket.order.total)}</p>
                  </div>
                  <Badge tone={ORDER_STATUS[ticket.order.status].tone}>{ORDER_STATUS[ticket.order.status].label}</Badge>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

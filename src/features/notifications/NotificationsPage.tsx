import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Megaphone, Send, Trash2, User, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import { Tabs } from '@/components/ui/tabs'
import { Pagination, Table, TableState, Td, Th, Tr } from '@/components/ui/table'
import { ConfirmDialog, PageHeader, UserAvatar } from '@/components/common'
import { api, apiErrorMessage } from '@/lib/api'
import { useDebounced } from '@/lib/hooks'
import { NOTIFICATION_CATEGORIES } from '@/lib/labels'
import type { AdminNotification, AppUser, NotificationCategory, Paginated } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'

type Audience = 'all' | 'broadcast' | 'personal'

export function NotificationsPage() {
  const qc = useQueryClient()
  const [audience, setAudience] = useState<Audience>('all')
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<AdminNotification | null>(null)

  const list = useQuery({
    queryKey: ['notifications', audience, page],
    queryFn: async () =>
      (await api.get<Paginated<AdminNotification>>('/admin/notifications', { params: { audience, page, limit: 20 } })).data,
    placeholderData: keepPreviousData,
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/notifications/${id}`),
    onSuccess: () => {
      toast.success('Notification supprimée')
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Messages affichés dans l'onglet notifications de l'application." />

      <div className="grid gap-6 xl:grid-cols-5">
        <Compose className="xl:col-span-2" />

        <Card className="xl:col-span-3">
          <CardHeader
            title="Historique"
            action={
              <Tabs
                value={audience}
                onChange={(a) => {
                  setAudience(a)
                  setPage(1)
                }}
                options={[
                  { value: 'all', label: 'Toutes' },
                  { value: 'broadcast', label: 'Générales' },
                  { value: 'personal', label: 'Personnelles' },
                ]}
              />
            }
          />
          <Table>
            <thead>
              <tr>
                <Th>Message</Th>
                <Th>Destinataire</Th>
                <Th>Envoyée</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {list.isLoading || !list.data ? (
                <TableState colSpan={4} loading />
              ) : list.data.items.length === 0 ? (
                <TableState colSpan={4} empty="Aucune notification" />
              ) : (
                list.data.items.map((n) => (
                  <Tr key={n.id}>
                    <Td className="max-w-sm">
                      <div className="flex items-center gap-2">
                        <Badge tone={NOTIFICATION_CATEGORIES[n.category].tone}>{NOTIFICATION_CATEGORIES[n.category].label}</Badge>
                        <p className="truncate font-semibold text-slate-800">{n.title}</p>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{n.message}</p>
                    </Td>
                    <Td className="whitespace-nowrap text-sm">
                      {n.user ? (
                        <span className="text-slate-700">
                          <User className="mr-1 inline h-3.5 w-3.5" />
                          {n.user.name}
                        </span>
                      ) : (
                        <span className="font-semibold text-blau">
                          <Megaphone className="mr-1 inline h-3.5 w-3.5" />
                          Tous
                        </span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-slate-500">
                      {formatDateTime(n.createdAt)}
                      <span className="block">{n.createdBy ? `par ${n.createdBy}` : 'automatique'}</span>
                    </Td>
                    <Td className="text-right">
                      <Button variant="ghost" size="icon" className="text-tunisia" onClick={() => setDeleting(n)} aria-label="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
          {list.data && <Pagination page={list.data.page} pages={list.data.pages} total={list.data.total} onPage={setPage} />}
        </Card>
      </div>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Supprimer la notification"
        danger
        description="Elle disparaîtra de l'application pour tous ses destinataires."
        confirmLabel="Supprimer"
        onConfirm={() => deleting && remove.mutateAsync(deleting.id)}
      />
    </div>
  )
}

function Compose({ className }: { className?: string }) {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState<NotificationCategory>('news')
  const [target, setTarget] = useState<AppUser | null>(null)
  const [mode, setMode] = useState<'all' | 'user'>('all')
  const [search, setSearch] = useState('')
  const debounced = useDebounced(search)

  const users = useQuery({
    queryKey: ['users', 'picker', debounced],
    queryFn: async () => (await api.get<Paginated<AppUser>>('/admin/users', { params: { search: debounced, limit: 6 } })).data.items,
    enabled: mode === 'user' && !target && debounced.length >= 2,
  })

  const send = useMutation({
    mutationFn: () =>
      api.post('/admin/notifications', {
        title: title.trim(),
        message: message.trim(),
        category,
        userId: mode === 'user' ? target?.id : undefined,
      }),
    onSuccess: () => {
      toast.success(mode === 'all' ? 'Notification envoyée à tous les supporters' : `Notification envoyée à ${target?.name}`)
      setTitle('')
      setMessage('')
      setTarget(null)
      setSearch('')
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const valid = title.trim().length >= 2 && message.trim().length >= 2 && (mode === 'all' || !!target)

  return (
    <Card className={className}>
      <CardHeader title="Nouvelle notification" />
      <CardContent className="space-y-4">
        <Tabs
          value={mode}
          onChange={(m) => setMode(m)}
          options={[
            { value: 'all', label: 'Tous les supporters' },
            { value: 'user', label: 'Un supporter' },
          ]}
        />
        {mode === 'user' &&
          (target ? (
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
              <UserAvatar name={target.name} seed={target.id} size="sm" />
              <div className="flex-1 text-sm">
                <p className="font-semibold">{target.name}</p>
                <p className="text-xs text-slate-500">@{target.username}</p>
              </div>
              <button className="cursor-pointer text-slate-400 hover:text-slate-700" onClick={() => setTarget(null)} aria-label="Changer">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un supporter…" />
              {users.data && users.data.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  {users.data.map((u) => (
                    <li key={u.id}>
                      <button
                        className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => setTarget(u)}
                      >
                        <UserAvatar name={u.name} seed={u.id} size="sm" />
                        <span>
                          {u.name} <span className="text-slate-400">@{u.username}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        <Field label="Catégorie">
          <Select value={category} onChange={(e) => setCategory(e.target.value as NotificationCategory)}>
            {(Object.keys(NOTIFICATION_CATEGORIES) as NotificationCategory[]).map((c) => (
              <option key={c} value={c}>
                {NOTIFICATION_CATEGORIES[c].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Titre">
          <Input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Clásico ce dimanche !" />
        </Field>
        <Field label="Message" hint={`${message.length}/1000`}>
          <Textarea rows={4} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Fais ton pronostic avant le coup d'envoi et gagne jusqu'à 200 BP." />
        </Field>
        <Button variant="primary" className="w-full" disabled={!valid} loading={send.isPending} onClick={() => send.mutate()}>
          <Send className="h-4 w-4" /> Envoyer
        </Button>
      </CardContent>
    </Card>
  )
}

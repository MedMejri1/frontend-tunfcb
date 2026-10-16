import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Flag, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select, Switch } from '@/components/ui/form'
import { ConfirmDialog, EmptyState, PageHeader } from '@/components/common'
import { api, apiErrorMessage } from '@/lib/api'
import { MISSION_EVENTS } from '@/lib/labels'
import type { Mission, MissionEvent } from '@/lib/types'
import { formatNumber } from '@/lib/utils'

type MissionInput = Omit<Mission, 'id'>

const EMPTY: MissionInput = {
  scope: 'daily',
  event: 'quiz_completed',
  title: '',
  description: '',
  icon: 'flag',
  color: '#EDBB00',
  target: 1,
  reward: 25,
  active: true,
  order: 0,
}

export function MissionsPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Mission | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Mission | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ['missions'],
    queryFn: async () => (await api.get<{ items: Mission[] }>('/admin/missions')).data.items,
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/missions/${id}`),
    onSuccess: () => {
      toast.success('Mission supprimée')
      qc.invalidateQueries({ queryKey: ['missions'] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const groups: Array<{ scope: Mission['scope']; title: string; description: string }> = [
    { scope: 'daily', title: 'Missions du jour', description: 'Remises à zéro chaque jour à minuit (heure de Tunis)' },
    { scope: 'weekly', title: 'Missions de la semaine', description: 'Remises à zéro chaque lundi' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Missions"
        description="La progression avance automatiquement selon l'événement choisi ; le supporter réclame ensuite sa récompense."
        actions={
          <Button variant="primary" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> Nouvelle mission
          </Button>
        }
      />

      {groups.map((g) => {
        const items = data?.filter((m) => m.scope === g.scope) ?? []
        return (
          <Card key={g.scope}>
            <CardHeader title={g.title} description={g.description} />
            {isLoading ? (
              <p className="p-6 text-sm text-slate-400">Chargement…</p>
            ) : items.length === 0 ? (
              <EmptyState icon={Flag} title="Aucune mission" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((m) => (
                  <li key={m.id} className="flex items-center gap-4 px-5 py-3">
                    <span className="h-9 w-1.5 rounded-full" style={{ background: m.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800">
                        {m.title}
                        {!m.active && <Badge className="ml-2">Inactive</Badge>}
                      </p>
                      <p className="text-xs text-slate-500">
                        {m.description} · déclencheur : <strong>{MISSION_EVENTS[m.event]}</strong> × {m.target}
                      </p>
                    </div>
                    <Badge tone="gold">+{formatNumber(m.reward)} BP</Badge>
                    <div className="flex">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(m)} aria-label="Modifier">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-tunisia" onClick={() => setDeleting(m)} aria-label="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )
      })}

      {editing && <MissionDialog mission={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Supprimer la mission"
        danger
        description={`« ${deleting?.title} » disparaîtra de l'application. Les points déjà réclamés sont conservés.`}
        confirmLabel="Supprimer"
        onConfirm={() => deleting && remove.mutateAsync(deleting.id)}
      />
    </div>
  )
}

const ICONS = ['flag', 'newspaper-outline', 'help-circle-outline', 'play-circle-outline', 'trending-up', 'flame', 'trophy-outline', 'people-outline', 'sync-circle', 'star']

function MissionDialog({ mission, onClose }: { mission: Mission | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<MissionInput>(() => (mission ? { ...mission } : EMPTY))

  const save = useMutation({
    mutationFn: (body: MissionInput) => (mission ? api.put(`/admin/missions/${mission.id}`, body) : api.post('/admin/missions', body)),
    onSuccess: () => {
      toast.success(mission ? 'Mission mise à jour' : 'Mission créée')
      qc.invalidateQueries({ queryKey: ['missions'] })
      onClose()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const valid = form.title.trim().length >= 3 && form.target >= 1 && form.reward >= 0

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={mission ? 'Modifier la mission' : 'Nouvelle mission'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" disabled={!valid} loading={save.isPending} onClick={() => save.mutate(form)}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titre" className="sm:col-span-2">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Faire 3 quiz" />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <Field label="Fréquence">
          <Select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as Mission['scope'] })}>
            <option value="daily">Quotidienne</option>
            <option value="weekly">Hebdomadaire</option>
          </Select>
        </Field>
        <Field label="Déclencheur" hint="Action qui fait avancer la mission">
          <Select value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value as MissionEvent })}>
            {(Object.keys(MISSION_EVENTS) as MissionEvent[]).map((ev) => (
              <option key={ev} value={ev}>
                {MISSION_EVENTS[ev]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Objectif (nombre de fois)">
          <Input type="number" min={1} value={form.target} onChange={(e) => setForm({ ...form, target: Number(e.target.value) })} />
        </Field>
        <Field label="Récompense (BP)">
          <Input type="number" min={0} value={form.reward} onChange={(e) => setForm({ ...form, reward: Number(e.target.value) })} />
        </Field>
        <Field label="Icône (Ionicons)">
          <Select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
            {[...new Set([form.icon, ...ICONS])].map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Couleur">
          <div className="flex gap-2">
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value.toUpperCase() })}
              className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200"
            />
            <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </div>
        </Field>
        <Field label="Ordre d'affichage">
          <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
        </Field>
        <div className="flex items-end pb-2">
          <Switch checked={form.active} onChange={(active) => setForm({ ...form, active })} label="Active dans l'app" />
        </div>
      </div>
    </Dialog>
  )
}

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2, HeartPulse, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/form'
import { Table, TableState, Td, Th, Tr } from '@/components/ui/table'
import { ConfirmDialog, PageHeader } from '@/components/common'
import { api, apiErrorMessage } from '@/lib/api'
import type { InjuryEntry, InjurySeverity, RosterPlayer } from '@/lib/types'
import { cn, formatDate, timeAgo } from '@/lib/utils'

const SEVERITY: Record<InjurySeverity, { label: string; tone: 'gold' | 'red' | 'grana' }> = {
  minor: { label: 'Léger', tone: 'gold' },
  moderate: { label: 'Modéré', tone: 'red' },
  severe: { label: 'Grave', tone: 'grana' },
}

const INJURY_TYPES = [
  'Blessure musculaire',
  'Ischio-jambiers',
  'Adducteurs',
  'Mollet',
  'Quadriceps',
  'Cheville',
  'Genou',
  'Ligaments croisés',
  'Ménisque',
  'Pied',
  'Dos',
  'Épaule',
  'Fracture',
  'Commotion',
  'Maladie',
]

const returnText = (i: InjuryEntry) =>
  [i.expectedReturn ? formatDate(i.expectedReturn) : null, i.returnNote || null].filter(Boolean).join(' · ') || 'À confirmer'

export function InjuriesPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<InjuryEntry | 'new' | null>(null)
  const [deleting, setDeleting] = useState<InjuryEntry | null>(null)
  // Fixed for the page lifetime: overdue returns are highlighted.
  const [today] = useState(() => new Date().toISOString().slice(0, 10))

  const injuries = useQuery({
    queryKey: ['team', 'injuries'],
    queryFn: async () => (await api.get<{ active: InjuryEntry[]; healed: InjuryEntry[] }>('/admin/team/injuries')).data,
  })

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<InjuryEntry> }) => api.patch(`/admin/team/injuries/${id}`, body),
    onSuccess: (_res, { body }) => {
      toast.success(body.active === false ? 'Joueur rétabli · retiré de l’infirmerie dans l’app' : 'Joueur remis à l’infirmerie')
      qc.invalidateQueries({ queryKey: ['team', 'injuries'] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/team/injuries/${id}`),
    onSuccess: () => {
      toast.success('Blessure supprimée')
      qc.invalidateQueries({ queryKey: ['team', 'injuries'] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const active = injuries.data?.active ?? []
  const healed = injuries.data?.healed ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Infirmerie"
        description="ESPN ne publie pas les blessures de LaLiga : tiens la liste à jour ici. Elle s’affiche dans l’app (Équipe › Effectif et fiche du joueur)."
        actions={
          <Button variant="primary" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> Ajouter un blessé
          </Button>
        }
      />

      <Card>
        <CardHeader title={`Blessés actuels · ${active.length}`} action={<HeartPulse className="h-5 w-5 text-tunisia" />} />
        <Table>
          <thead>
            <tr>
              <Th>Joueur</Th>
              <Th>Blessure</Th>
              <Th>Retour prévu</Th>
              <Th>Gravité</Th>
              <Th>Mis à jour</Th>
              <Th className="w-40" />
            </tr>
          </thead>
          <tbody>
            {injuries.isLoading ? (
              <TableState colSpan={6} loading />
            ) : !active.length ? (
              <TableState colSpan={6} empty="Aucun joueur blessé : l’app affiche « Aucun joueur blessé actuellement »." />
            ) : (
              active.map((i) => (
                <Tr key={i.id}>
                  <Td>
                    <p className="font-semibold text-navy-900">{i.playerName}</p>
                    <p className="text-xs text-slate-400">{i.position}</p>
                  </Td>
                  <Td>{i.injuryType}</Td>
                  <Td className={cn(i.expectedReturn && i.expectedReturn.slice(0, 10) < today && 'text-amber-600')}>{returnText(i)}</Td>
                  <Td>
                    <Badge tone={SEVERITY[i.severity].tone}>{SEVERITY[i.severity].label}</Badge>
                  </Td>
                  <Td className="text-xs text-slate-500">{timeAgo(i.updatedAt)}</Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="text-emerald-700" onClick={() => update.mutate({ id: i.id, body: { active: false } })}>
                        <CheckCircle2 className="h-4 w-4" /> Rétabli
                      </Button>
                      <Button variant="ghost" size="icon" title="Modifier" onClick={() => setEditing(i)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Supprimer" className="text-tunisia" onClick={() => setDeleting(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      {healed.length > 0 && (
        <Card>
          <CardHeader title="Rétablis récemment" description="60 derniers jours" />
          <Table>
            <thead>
              <tr>
                <Th>Joueur</Th>
                <Th>Blessure</Th>
                <Th>Rétabli</Th>
                <Th className="w-40" />
              </tr>
            </thead>
            <tbody>
              {healed.map((i) => (
                <Tr key={i.id}>
                  <Td className="font-semibold text-navy-900">{i.playerName}</Td>
                  <Td className="text-slate-600">{i.injuryType}</Td>
                  <Td className="text-slate-500">{formatDate(i.healedAt)}</Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => update.mutate({ id: i.id, body: { active: true } })}>
                        <RotateCcw className="h-4 w-4" /> Rechute
                      </Button>
                      <Button variant="ghost" size="icon" title="Supprimer" className="text-tunisia" onClick={() => setDeleting(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {editing && <InjuryDialog injury={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Supprimer cette blessure ?"
        description={<>La blessure de {deleting?.playerName} sera supprimée de l’historique.</>}
        confirmLabel="Supprimer"
        danger
        onConfirm={() => deleting && remove.mutateAsync(deleting.id)}
      />
    </div>
  )
}

function InjuryDialog({ injury, onClose }: { injury: InjuryEntry | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [playerId, setPlayerId] = useState(injury?.playerId ?? '')
  const [injuryType, setInjuryType] = useState(injury?.injuryType ?? '')
  const [expectedReturn, setExpectedReturn] = useState(injury?.expectedReturn?.slice(0, 10) ?? '')
  const [returnNote, setReturnNote] = useState(injury?.returnNote ?? '')
  const [severity, setSeverity] = useState<InjurySeverity>(injury?.severity ?? 'moderate')

  const roster = useQuery({
    queryKey: ['team', 'roster'],
    queryFn: async () => (await api.get<{ players: RosterPlayer[] }>('/admin/team/roster')).data.players,
    staleTime: 60 * 60 * 1000,
    enabled: !injury,
  })
  const player = roster.data?.find((p) => p.id === playerId)

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        injuryType: injuryType.trim(),
        expectedReturn: expectedReturn || null,
        returnNote: returnNote.trim(),
        severity,
      }
      if (injury) await api.patch(`/admin/team/injuries/${injury.id}`, body)
      else await api.post('/admin/team/injuries', { ...body, playerId, playerName: player?.name, position: player?.position ?? '' })
    },
    onSuccess: () => {
      toast.success(injury ? 'Blessure mise à jour' : 'Joueur ajouté à l’infirmerie · visible dans l’app')
      qc.invalidateQueries({ queryKey: ['team', 'injuries'] })
      onClose()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const valid = (injury || player) && injuryType.trim().length >= 2

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={injury ? `Blessure · ${injury.playerName}` : 'Ajouter un blessé'}
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
        {!injury && (
          <Field label="Joueur" hint={roster.isError ? 'Effectif ESPN indisponible, réessaie' : undefined}>
            <Select value={playerId} onChange={(e) => setPlayerId(e.target.value)} disabled={roster.isLoading}>
              <option value="">{roster.isLoading ? 'Chargement de l’effectif…' : 'Choisir un joueur'}</option>
              {roster.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.number ? `${p.number} · ` : ''}
                  {p.name} {p.position ? `(${p.position})` : ''}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Blessure">
          <Input value={injuryType} list="injury-types" placeholder="Ischio-jambiers, cheville…" onChange={(e) => setInjuryType(e.target.value)} />
          <datalist id="injury-types">
            {INJURY_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Retour prévu (optionnel)">
            <Input type="date" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} />
          </Field>
          <Field label="Précision (optionnel)" hint="Ex. : 2 à 3 semaines">
            <Input value={returnNote} maxLength={80} onChange={(e) => setReturnNote(e.target.value)} />
          </Field>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Gravité</p>
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            {(Object.keys(SEVERITY) as InjurySeverity[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={cn(
                  'cursor-pointer rounded-md px-4 py-1.5 text-xs font-semibold',
                  severity === s ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500',
                )}
              >
                {SEVERITY[s].label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  )
}

import { useState, type ChangeEvent } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Ban, Eye, Gavel, Plus, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/form'
import { Tabs } from '@/components/ui/tabs'
import { Pagination, Table, TableState, Td, Th, Tr } from '@/components/ui/table'
import { ConfirmDialog, PageHeader } from '@/components/common'
import { api, apiErrorMessage } from '@/lib/api'
import { MATCH_STATUS } from '@/lib/labels'
import type { MatchPrediction, MatchStatus, MatchTeam, Paginated, PredictionMatch } from '@/lib/types'
import { formatDateTime, timeAgo } from '@/lib/utils'

type StatusFilter = MatchStatus | 'all'

function TeamCell({ team }: { team: MatchTeam }) {
  return (
    <span className="inline-flex items-center gap-2">
      {team.logo ? (
        <img src={team.logo} alt="" className="h-6 w-6 object-contain" />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-500">
          {team.short}
        </span>
      )}
      <span className="font-semibold text-slate-800">{team.name}</span>
    </span>
  )
}

export function PredictionsPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState<StatusFilter>('open')
  const [page, setPage] = useState(1)
  const [settling, setSettling] = useState<PredictionMatch | null>(null)
  const [cancelling, setCancelling] = useState<PredictionMatch | null>(null)
  const [viewing, setViewing] = useState<PredictionMatch | null>(null)
  const [creating, setCreating] = useState(false)

  const matches = useQuery({
    queryKey: ['predictions', 'matches', status, page],
    queryFn: async () =>
      (
        await api.get<Paginated<PredictionMatch>>('/admin/predictions/matches', {
          params: { status: status === 'all' ? undefined : status, page, limit: 20 },
        })
      ).data,
    placeholderData: keepPreviousData,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['predictions'] })

  const sync = useMutation({
    mutationFn: async () =>
      (await api.post<{ fixtures: number; created: number; settled: number; closed: number }>('/admin/predictions/sync')).data,
    onSuccess: (r) => {
      toast.success(`ESPN : ${r.created} match(s) ajouté(s), ${r.settled} réglé(s), ${r.closed} fermé(s)`)
      invalidate()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/admin/predictions/matches/${id}/cancel`),
    onSuccess: () => {
      toast.success('Match annulé, aucun point distribué')
      invalidate()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  return (
    <div>
      <PageHeader
        title="Pronostics"
        description="Les matchs du Barça sont importés d'ESPN, fermés au coup d'envoi et réglés automatiquement avec le score officiel."
        actions={
          <>
            <Button variant="outline" loading={sync.isPending} onClick={() => sync.mutate()}>
              <RefreshCw className="h-4 w-4" /> Synchroniser ESPN
            </Button>
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Match manuel
            </Button>
          </>
        }
      />

      <Tabs
        value={status}
        onChange={(s) => {
          setStatus(s)
          setPage(1)
        }}
        options={[
          { value: 'open', label: 'Ouverts' },
          { value: 'closed', label: 'En cours / à régler' },
          { value: 'settled', label: 'Réglés' },
          { value: 'cancelled', label: 'Annulés' },
          { value: 'all', label: 'Tous' },
        ]}
      />

      <Card className="mt-4">
        <Table>
          <thead>
            <tr>
              <Th>Coup d'envoi</Th>
              <Th>Match</Th>
              <Th>Compétition</Th>
              <Th className="text-center">Score</Th>
              <Th className="text-right">Pronos</Th>
              <Th>Statut</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {matches.isLoading || !matches.data ? (
              <TableState colSpan={7} loading />
            ) : matches.data.items.length === 0 ? (
              <TableState colSpan={7} empty="Aucun match. Lance une synchronisation ESPN." />
            ) : (
              matches.data.items.map((m) => (
                <Tr key={m.id}>
                  <Td className="whitespace-nowrap">
                    <p className="font-medium text-slate-800">{formatDateTime(m.kickoff)}</p>
                    <p className="text-xs text-slate-500">{timeAgo(m.kickoff)}</p>
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <TeamCell team={m.home} />
                      <TeamCell team={m.away} />
                    </div>
                  </Td>
                  <Td className="text-slate-600">
                    {m.competition}
                    {!m.espnEventId && <span className="ml-1 text-xs text-slate-400">(manuel)</span>}
                  </Td>
                  <Td className="text-center text-base font-extrabold text-navy-900">
                    {m.result ? `${m.result.home} - ${m.result.away}` : '—'}
                  </Td>
                  <Td className="text-right font-semibold">{m.predictionsCount}</Td>
                  <Td>
                    <Badge tone={MATCH_STATUS[m.status].tone}>{MATCH_STATUS[m.status].label}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-right">
                    <Button variant="ghost" size="icon" onClick={() => setViewing(m)} aria-label="Voir les pronostics">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {(m.status === 'open' || m.status === 'closed') && (
                      <>
                        <Button variant="ghost" size="icon" className="text-blau" onClick={() => setSettling(m)} aria-label="Régler">
                          <Gavel className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-tunisia" onClick={() => setCancelling(m)} aria-label="Annuler">
                          <Ban className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
        {matches.data && (
          <Pagination page={matches.data.page} pages={matches.data.pages} total={matches.data.total} onPage={setPage} />
        )}
      </Card>

      {settling && <SettleDialog match={settling} onClose={() => setSettling(null)} onDone={invalidate} />}
      {viewing && <MatchPredictionsDialog match={viewing} onClose={() => setViewing(null)} />}
      {creating && <CreateMatchDialog onClose={() => setCreating(false)} onDone={invalidate} />}
      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(o) => !o && setCancelling(null)}
        title="Annuler le match"
        danger
        description="Les pronostics de ce match seront annulés sans distribuer de points (match reporté, erreur…)."
        confirmLabel="Annuler le match"
        onConfirm={() => cancelling && cancel.mutateAsync(cancelling.id)}
      />
    </div>
  )
}

function SettleDialog({ match, onClose, onDone }: { match: PredictionMatch; onClose: () => void; onDone: () => void }) {
  const [home, setHome] = useState('')
  const [away, setAway] = useState('')
  const settle = useMutation({
    mutationFn: async () =>
      (
        await api.post<{ settled: number; winners: number }>(`/admin/predictions/matches/${match.id}/settle`, {
          home: Number(home),
          away: Number(away),
        })
      ).data,
    onSuccess: (r) => {
      toast.success(`${r.settled} pronostic(s) réglé(s), ${r.winners} gagnant(s)`)
      onDone()
      onClose()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })
  const valid = home !== '' && away !== '' && Number(home) >= 0 && Number(away) >= 0

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Régler le match"
      description="Saisis le score final : les points sont versés immédiatement et ne peuvent pas être repris."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" disabled={!valid} loading={settle.isPending} onClick={() => settle.mutate()}>
            Valider le score
          </Button>
        </>
      }
    >
      <div className="flex items-end justify-center gap-4">
        <Field label={match.home.name} className="w-32 text-center">
          <Input type="number" min={0} value={home} onChange={(e) => setHome(e.target.value)} className="text-center text-lg font-bold" />
        </Field>
        <span className="pb-2 text-xl font-bold text-slate-400">-</span>
        <Field label={match.away.name} className="w-32 text-center">
          <Input type="number" min={0} value={away} onChange={(e) => setAway(e.target.value)} className="text-center text-lg font-bold" />
        </Field>
      </div>
    </Dialog>
  )
}

const OUTCOME = {
  pending: { label: 'En attente', tone: 'slate' as const },
  exact: { label: 'Score exact', tone: 'green' as const },
  correct: { label: 'Bon résultat', tone: 'blue' as const },
  wrong: { label: 'Perdu', tone: 'red' as const },
  void: { label: 'Annulé', tone: 'slate' as const },
}

function MatchPredictionsDialog({ match, onClose }: { match: PredictionMatch; onClose: () => void }) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ['predictions', 'match', match.id, page],
    queryFn: async () =>
      (
        await api.get<Paginated<MatchPrediction> & { topScores: Array<{ score: string; count: number }> }>(
          `/admin/predictions/matches/${match.id}/predictions`,
          { params: { page, limit: 15 } },
        )
      ).data,
    placeholderData: keepPreviousData,
  })

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`${match.home.name} - ${match.away.name}`}
      description={`${match.competition} · ${formatDateTime(match.kickoff)}`}
      size="lg"
    >
      {data && data.topScores.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Scores les plus pronostiqués</p>
          <div className="flex flex-wrap gap-2">
            {data.topScores.map((s) => (
              <span key={s.score} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-navy-900">
                {s.score} <span className="ml-1 text-xs font-medium text-slate-500">× {s.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      <Table>
        <thead>
          <tr>
            <Th>Supporter</Th>
            <Th className="text-center">Prono</Th>
            <Th>Résultat</Th>
            <Th className="text-right">Points</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading || !data ? (
            <TableState colSpan={4} loading />
          ) : data.items.length === 0 ? (
            <TableState colSpan={4} empty="Aucun pronostic pour ce match" />
          ) : (
            data.items.map((p) => (
              <Tr key={p.id}>
                <Td>
                  {p.user ? (
                    <Link to={`/users/${p.user.id}`} className="font-semibold text-slate-800 hover:text-blau">
                      {p.user.name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td className="text-center font-bold">
                  {p.home} - {p.away}
                </Td>
                <Td>
                  <Badge tone={OUTCOME[p.outcome].tone}>{OUTCOME[p.outcome].label}</Badge>
                </Td>
                <Td className="text-right font-semibold">{p.pointsAwarded ? `+${p.pointsAwarded}` : '—'}</Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>
      {data && data.pages > 1 && <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
    </Dialog>
  )
}

function CreateMatchDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    competition: 'Amical',
    homeName: 'Barcelona',
    homeShort: 'BAR',
    awayName: '',
    awayShort: '',
    kickoff: '',
    venue: '',
  })
  const create = useMutation({
    mutationFn: () =>
      api.post('/admin/predictions/matches', {
        competition: form.competition,
        home: { name: form.homeName, short: form.homeShort },
        away: { name: form.awayName, short: form.awayShort },
        kickoff: new Date(form.kickoff).toISOString(),
        venue: form.venue || undefined,
      }),
    onSuccess: () => {
      toast.success('Match ouvert aux pronostics')
      onDone()
      onClose()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })
  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value })
  const valid = form.homeName && form.homeShort.length >= 2 && form.awayName && form.awayShort.length >= 2 && form.kickoff

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Match manuel"
      description="Pour un match absent d'ESPN (amical, match de légendes…). Tu devras le régler toi-même."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" disabled={!valid} loading={create.isPending} onClick={() => create.mutate()}>
            Ouvrir les pronostics
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Compétition">
          <Input value={form.competition} onChange={set('competition')} />
        </Field>
        <Field label="Coup d'envoi">
          <Input type="datetime-local" value={form.kickoff} onChange={set('kickoff')} />
        </Field>
        <Field label="Domicile">
          <Input value={form.homeName} onChange={set('homeName')} />
        </Field>
        <Field label="Abréviation">
          <Input value={form.homeShort} maxLength={5} onChange={set('homeShort')} />
        </Field>
        <Field label="Extérieur">
          <Input value={form.awayName} onChange={set('awayName')} placeholder="Barça Legends" />
        </Field>
        <Field label="Abréviation">
          <Input value={form.awayShort} maxLength={5} onChange={set('awayShort')} placeholder="LEG" />
        </Field>
        <Field label="Stade (optionnel)" className="sm:col-span-2">
          <Input value={form.venue} onChange={set('venue')} placeholder="Stade Olympique de Radès" />
        </Field>
      </div>
    </Dialog>
  )
}

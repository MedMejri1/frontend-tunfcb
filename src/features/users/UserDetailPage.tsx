import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Ban,
  CircleCheck,
  CircleHelp,
  Coins,
  KeyRound,
  Loader2,
  Pencil,
  Target,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import { Table, TableState, Td, Th, Tr } from '@/components/ui/table'
import { CountryFlag, ConfirmDialog, StatCard, UserAvatar } from '@/components/common'
import { apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { COUNTRIES, TRANSACTION_TYPES } from '@/lib/labels'
import type { AppUser } from '@/lib/types'
import { cn, formatDate, formatDateTime, formatNumber, formatPoints, timeAgo, contactLine } from '@/lib/utils'
import {
  useAdjustPoints,
  useDeleteUser,
  useResetPassword,
  useSetStatus,
  useUpdateUser,
  useUserDetail,
} from './api'

type DialogKind = 'points' | 'ban' | 'unban' | 'edit' | 'password' | 'delete' | null

export function UserDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { isSuperAdmin } = useAuth()
  const { data, isLoading, error } = useUserDetail(id)
  const [dialog, setDialog] = useState<DialogKind>(null)
  const setStatus = useSetStatus(id)
  const deleteUser = useDeleteUser(id)

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blau" />
      </div>
    )
  }
  if (error || !data) {
    return <p className="py-20 text-center text-sm text-slate-500">{apiErrorMessage(error)}</p>
  }

  const { user, ranks, games } = data
  const progress = user.nextLevelXp ? Math.min(100, Math.round((user.currentXp / user.nextLevelXp) * 100)) : 100
  const maxTypePoints = Math.max(1, ...data.pointsByType.map((t) => Math.abs(t.points)))
  const close = () => setDialog(null)

  return (
    <div className="space-y-6">
      <Link to="/users" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" /> Utilisateurs
      </Link>

      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-blau via-grana to-navy-900" />
        <CardContent className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Only the avatar overlaps the banner; the text stays on white. */}
            <div className="-mt-12 rounded-full ring-4 ring-white">
              <UserAvatar name={user.name} seed={user.id} size="lg" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold text-navy-900">{user.name}</h1>
                {user.status === 'active' ? <Badge tone="green">Actif</Badge> : <Badge tone="red">Suspendu</Badge>}
                {user.isDemo && <Badge>Démo</Badge>}
              </div>
              <p className="text-sm text-slate-500">
                @{user.username} · {contactLine(user)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                <CountryFlag code={user.country} />{[user.city, COUNTRIES[user.country] ?? user.country].filter(Boolean).join(', ')} · inscrit le{' '}
                {formatDate(user.createdAt)} · actif {timeAgo(user.lastActiveAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="gold" size="sm" onClick={() => setDialog('points')}>
              <Coins className="h-4 w-4" /> Ajuster les points
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDialog('edit')}>
              <Pencil className="h-4 w-4" /> Modifier
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDialog('password')}>
              <KeyRound className="h-4 w-4" /> Mot de passe
            </Button>
            {user.status === 'active' ? (
              <Button variant="outline" size="sm" className="text-tunisia" onClick={() => setDialog('ban')}>
                <Ban className="h-4 w-4" /> Suspendre
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="text-emerald-700" onClick={() => setDialog('unban')}>
                <CircleCheck className="h-4 w-4" /> Réactiver
              </Button>
            )}
            {isSuperAdmin && (
              <Button variant="ghost" size="sm" className="text-tunisia" onClick={() => setDialog('delete')}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>

        {user.status === 'banned' && (
          <div className="mx-5 mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-tunisia">
            <strong>Suspendu le {formatDateTime(user.bannedAt)}</strong> — {user.banReason}
          </div>
        )}

        <div className="grid border-t border-slate-100 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Solde" value={`${formatNumber(user.balance)} BP`} />
          <Metric label="XP total" value={formatNumber(user.xp)} />
          <div className="border-slate-100 px-5 py-4 sm:border-l">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Niveau {user.level} · {user.levelName}
            </p>
            <div className="mt-2 h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-gradient-to-r from-blau to-grana" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {user.nextLevelXp ? `${formatNumber(user.currentXp)} / ${formatNumber(user.nextLevelXp)} XP` : 'Niveau maximum'}
            </p>
          </div>
          <Metric label="Rang général" value={ranks.all ? `#${ranks.all}` : '—'} />
          <Metric
            label="Rang semaine"
            value={ranks.week ? `#${ranks.week}` : '—'}
            hint={`${formatNumber(ranks.weekPoints)} BP cette semaine`}
          />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Quiz"
          value={games.quiz.played}
          hint={`${games.quiz.accuracy}% de bonnes réponses · ${games.quiz.perfect} parfait(s)`}
          icon={CircleHelp}
          tone="gold"
        />
        <StatCard
          label="Pronostics"
          value={games.predictions.total}
          hint={`${games.predictions.exact} exact(s) · ${games.predictions.correct} bon(s) · ${games.predictions.pending} en attente`}
          icon={Target}
        />
        <StatCard label="Tours de roue" value={games.wheelSpins} hint={`${games.adsWatchedToday} pub(s) aujourd'hui`} icon={Trophy} tone="grana" />
        <StatCard
          label="Série quotidienne"
          value={`🔥 ${user.streak}`}
          hint={`Record : ${user.bestStreak} jour(s)`}
          icon={Coins}
          tone="violet"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Points par source" description="Depuis l'inscription" />
          <CardContent className="space-y-3">
            {data.pointsByType.length === 0 && <p className="text-sm text-slate-400">Aucune transaction</p>}
            {data.pointsByType.map((t) => (
              <div key={t.type}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">
                    {TRANSACTION_TYPES[t.type]?.label ?? t.type} <span className="text-slate-400">× {t.count}</span>
                  </span>
                  <span className={cn('font-bold', t.points < 0 ? 'text-tunisia' : 'text-slate-800')}>{formatPoints(t.points)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${(Math.abs(t.points) / maxTypePoints) * 100}%`, background: TRANSACTION_TYPES[t.type]?.color }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Dernières transactions"
            action={
              <Link to={`/transactions?user=${user.id}`} className="text-xs font-semibold text-blau hover:underline">
                Historique complet
              </Link>
            }
          />
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Type</Th>
                <Th>Libellé</Th>
                <Th className="text-right">Points</Th>
                <Th className="text-right">Solde</Th>
              </tr>
            </thead>
            <tbody>
              {data.recentTransactions.length === 0 ? (
                <TableState colSpan={5} empty="Aucune transaction" />
              ) : (
                data.recentTransactions.map((t) => (
                  <Tr key={t.id}>
                    <Td className="whitespace-nowrap text-xs text-slate-500">{formatDateTime(t.createdAt)}</Td>
                    <Td>
                      <Badge tone={TRANSACTION_TYPES[t.type]?.tone}>{TRANSACTION_TYPES[t.type]?.label ?? t.type}</Badge>
                    </Td>
                    <Td>
                      <p className="font-medium text-slate-800">{t.title}</p>
                      {t.detail && <p className="text-xs text-slate-500">{t.detail}</p>}
                    </Td>
                    <Td className={cn('text-right font-bold', t.points < 0 ? 'text-tunisia' : 'text-emerald-600')}>
                      {formatPoints(t.points)}
                    </Td>
                    <Td className="text-right text-slate-500">{formatNumber(t.balanceAfter)}</Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Parrainage"
          description={`Code : ${user.referralCode} · ${user.referralsCount} filleul(s)`}
        />
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            <Users className="mr-1.5 inline h-4 w-4 text-slate-400" />
            Parrain :{' '}
            {data.referrer ? (
              <Link to={`/users/${data.referrer.id}`} className="font-semibold text-blau hover:underline">
                {data.referrer.name} (@{data.referrer.username})
              </Link>
            ) : (
              <span className="text-slate-400">aucun</span>
            )}
          </p>
          {data.referrals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.referrals.map((r) => (
                <Link
                  key={r.id}
                  to={`/users/${r.id}`}
                  className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 text-xs hover:bg-slate-50"
                >
                  <UserAvatar name={r.name} seed={r.id} size="sm" />
                  <span className="font-semibold text-slate-700">{r.name}</span>
                  <span className="text-slate-400">{formatDate(r.createdAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AdjustPointsDialog userId={id} balance={user.balance} open={dialog === 'points'} onClose={close} />
      <BanDialog userId={id} open={dialog === 'ban'} onClose={close} />
      <EditUserDialog user={user} open={dialog === 'edit'} onClose={close} />
      <PasswordDialog userId={id} open={dialog === 'password'} onClose={close} />
      <ConfirmDialog
        open={dialog === 'unban'}
        onOpenChange={(o) => !o && close()}
        title="Réactiver le compte"
        description={`${user.name} pourra de nouveau utiliser l'application.`}
        confirmLabel="Réactiver"
        onConfirm={async () => {
          await setStatus.mutateAsync({ status: 'active' })
          toast.success('Compte réactivé')
        }}
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        onOpenChange={(o) => !o && close()}
        title="Supprimer définitivement"
        danger
        description={
          <>
            Le compte de <strong>{user.name}</strong>, ses points, transactions, quiz et pronostics seront supprimés.
            Cette action est irréversible.
          </>
        }
        confirmLabel="Supprimer"
        onConfirm={async () => {
          try {
            await deleteUser.mutateAsync()
            toast.success('Utilisateur supprimé')
            navigate('/users', { replace: true })
          } catch (err) {
            toast.error(apiErrorMessage(err))
          }
        }}
      />
    </div>
  )
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border-slate-100 px-5 py-4 sm:border-l first:sm:border-l-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-navy-900">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

interface DialogBaseProps {
  open: boolean
  onClose: () => void
}

function AdjustPointsDialog({ userId, balance, open, onClose }: DialogBaseProps & { userId: string; balance: number }) {
  const adjust = useAdjustPoints(userId)
  const [mode, setMode] = useState<'credit' | 'debit'>('credit')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const value = Number(amount)
  const valid = Number.isInteger(value) && value > 0 && reason.trim().length >= 3 && (mode === 'credit' || value <= balance)

  const submit = async () => {
    try {
      await adjust.mutateAsync({ amount: mode === 'credit' ? value : -value, reason: reason.trim() })
      toast.success(mode === 'credit' ? `${value} BP crédités` : `${value} BP retirés`)
      setAmount('')
      setReason('')
      onClose()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Ajuster les points"
      description={`Solde actuel : ${formatNumber(balance)} BP. L'opération est tracée dans l'historique.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant={mode === 'credit' ? 'primary' : 'danger'} disabled={!valid} loading={adjust.isPending} onClick={submit}>
            {mode === 'credit' ? 'Créditer' : 'Retirer'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(['credit', 'debit'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold',
                mode === m
                  ? m === 'credit'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-tunisia bg-red-50 text-tunisia'
                  : 'border-slate-200 text-slate-500',
              )}
            >
              {m === 'credit' ? '+ Bonus' : '− Correction'}
            </button>
          ))}
        </div>
        <Field
          label="Montant (BP)"
          error={mode === 'debit' && value > balance ? 'Supérieur au solde actuel' : undefined}
        >
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" />
        </Field>
        <Field label="Motif" hint="Visible par le supporter dans son historique">
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Gagnant du concours Instagram" />
        </Field>
      </div>
    </Dialog>
  )
}

function BanDialog({ userId, open, onClose }: DialogBaseProps & { userId: string }) {
  const setStatus = useSetStatus(userId)
  const [reason, setReason] = useState('')

  const submit = async () => {
    try {
      await setStatus.mutateAsync({ status: 'banned', reason: reason.trim() })
      toast.success('Compte suspendu')
      setReason('')
      onClose()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Suspendre le compte"
      description="Le supporter est déconnecté immédiatement et disparaît des classements."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="danger" disabled={reason.trim().length < 3} loading={setStatus.isPending} onClick={submit}>
            Suspendre
          </Button>
        </>
      }
    >
      <Field label="Motif de la suspension" hint="Affiché au supporter lorsqu'il tente de se connecter">
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Triche au quiz, comportement abusif…" />
      </Field>
    </Dialog>
  )
}

function EditUserDialog({ user, open, onClose }: DialogBaseProps & { user: AppUser }) {
  const update = useUpdateUser(user.id)
  const [form, setForm] = useState({ firstName: user.firstName, lastName: user.lastName, city: user.city, country: user.country })

  const submit = async () => {
    try {
      await update.mutateAsync(form)
      toast.success('Profil mis à jour')
      onClose()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Modifier le profil"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" loading={update.isPending} disabled={!form.firstName.trim()} onClick={submit}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom">
          <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        </Field>
        <Field label="Nom">
          <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </Field>
        <Field label="Ville">
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
        <Field label="Pays">
          <Select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
            {Object.entries(COUNTRIES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Dialog>
  )
}

function PasswordDialog({ userId, open, onClose }: DialogBaseProps & { userId: string }) {
  const reset = useResetPassword(userId)
  const [password, setPassword] = useState('')

  const submit = async () => {
    try {
      await reset.mutateAsync(password)
      toast.success('Mot de passe réinitialisé')
      setPassword('')
      onClose()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Nouveau mot de passe"
      description="Communique-le au supporter par un canal sûr ; il pourra le changer depuis l'app."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" disabled={password.length < 8} loading={reset.isPending} onClick={submit}>
            Réinitialiser
          </Button>
        </>
      }
    >
      <Field label="Mot de passe" hint="8 caractères minimum">
        <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
      </Field>
    </Dialog>
  )
}

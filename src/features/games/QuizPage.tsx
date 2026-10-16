import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2, CircleHelp, FileSpreadsheet, Pencil, Plus, Search, Trash2, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/form'
import { Pagination, Table, TableState, Td, Th, Tr } from '@/components/ui/table'
import { ConfirmDialog, PageHeader, StatCard } from '@/components/common'
import { api, apiErrorMessage } from '@/lib/api'
import { useDebounced } from '@/lib/hooks'
import type { Paginated, QuizQuestion, QuizStats } from '@/lib/types'
import { cn } from '@/lib/utils'
import { QuizImportDialog } from './QuizImportDialog'

const DIFFICULTY = {
  easy: { label: 'Facile', tone: 'green' as const },
  medium: { label: 'Moyen', tone: 'gold' as const },
  hard: { label: 'Difficile', tone: 'red' as const },
}

type QuestionInput = Omit<QuizQuestion, 'id' | 'timesAsked' | 'successRate' | 'createdAt' | 'language'>

const EMPTY: QuestionInput = {
  question: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  category: 'histoire',
  difficulty: 'medium',
  active: true,
}

export function QuizPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [active, setActive] = useState('')
  const [language, setLanguage] = useState('')
  const [importing, setImporting] = useState(false)
  const [page, setPage] = useState(1)
  const debounced = useDebounced(search)
  const [editing, setEditing] = useState<QuizQuestion | 'new' | null>(null)
  const [deleting, setDeleting] = useState<QuizQuestion | null>(null)

  const stats = useQuery({
    queryKey: ['quiz', 'stats'],
    queryFn: async () => (await api.get<QuizStats>('/admin/quiz/stats')).data,
  })

  const questions = useQuery({
    queryKey: ['quiz', 'questions', { debounced, category, active, language, page }],
    queryFn: async () =>
      (
        await api.get<Paginated<QuizQuestion> & { categories: string[] }>('/admin/quiz/questions', {
          params: { search: debounced || undefined, category: category || undefined, active: active || undefined, language: language || undefined, page, limit: 15 },
        })
      ).data,
    placeholderData: keepPreviousData,
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete<{ deactivated: boolean }>(`/admin/quiz/questions/${id}`),
    onSuccess: ({ data }) => {
      toast.success(data.deactivated ? 'Question déjà jouée : désactivée plutôt que supprimée' : 'Question supprimée')
      qc.invalidateQueries({ queryKey: ['quiz'] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const s = stats.data
  const today = s?.history.find((h) => h.dayKey === s.today.dayKey)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quiz du jour"
        description="Chaque jour, tous les supporters reçoivent les mêmes questions tirées au sort parmi les questions actives."
        actions={
          <>
            <Button variant="outline" onClick={() => setImporting(true)}>
              <FileSpreadsheet className="h-4 w-4" /> Importer (Excel)
            </Button>
            <Button variant="primary" onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> Nouvelle question
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Questions actives"
          value={s?.activeQuestions ?? '—'}
          hint={`${s?.totalQuestions ?? 0} au total`}
          icon={CircleHelp}
          tone="gold"
        />
        <StatCard label="Joueurs aujourd'hui" value={s?.today.players ?? '—'} hint={`${today?.perfect ?? 0} sans faute`} icon={Users} />
        <StatCard
          label="Taux de réussite du jour"
          value={today ? `${today.accuracy}%` : '—'}
          hint="Bonnes réponses / réponses"
          icon={CheckCircle2}
          tone="green"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Questions du jour" description={s?.today.dayKey} />
          <CardContent>
            {s?.today.questions.length ? (
              <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
                {s.today.questions.map((q) => (
                  <li key={q.id}>{q.question}</li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-400">Tirées au premier quiz lancé aujourd'hui.</p>
            )}
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Participation (14 derniers jours)" />
          <Table>
            <thead>
              <tr>
                <Th>Jour</Th>
                <Th className="text-right">Joueurs</Th>
                <Th className="text-right">Réussite</Th>
                <Th className="text-right">Sans faute</Th>
              </tr>
            </thead>
            <tbody>
              {!s ? (
                <TableState colSpan={4} loading />
              ) : s.history.length === 0 ? (
                <TableState colSpan={4} empty="Aucune partie jouée" />
              ) : (
                s.history.map((h) => (
                  <Tr key={h.dayKey}>
                    <Td>{h.dayKey}</Td>
                    <Td className="text-right font-semibold">{h.players}</Td>
                    <Td className="text-right">{h.accuracy}%</Td>
                    <Td className="text-right">{h.perfect}</Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Rechercher une question…"
            />
          </div>
          <Select
            className="w-52"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Toutes catégories</option>
            {questions.data?.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            className="w-36"
            value={active}
            onChange={(e) => {
              setActive(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Toutes</option>
            <option value="true">Actives</option>
            <option value="false">Inactives</option>
          </Select>
          <Select
            className="w-44"
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Toutes langues</option>
            <option value="fr">Français</option>
            <option value="ar">Arabe</option>
          </Select>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Question</Th>
              <Th>Catégorie</Th>
              <Th>Difficulté</Th>
              <Th className="text-right">Posée</Th>
              <Th className="text-right">Réussite</Th>
              <Th>Statut</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {questions.isLoading || !questions.data ? (
              <TableState colSpan={7} loading />
            ) : questions.data.items.length === 0 ? (
              <TableState colSpan={7} empty="Aucune question" />
            ) : (
              questions.data.items.map((q) => (
                <Tr key={q.id}>
                  <Td className="max-w-md">
                    <p dir="auto" className="font-medium text-slate-800">
                      {q.language === 'ar' && <Badge tone="violet" className="me-2 align-middle">AR</Badge>}
                      {q.question}
                    </p>
                    <p dir="auto" className="mt-0.5 text-xs text-emerald-700">✓ {q.options[q.correctIndex]}</p>
                  </Td>
                  <Td className="capitalize text-slate-600">{q.category}</Td>
                  <Td>
                    <Badge tone={DIFFICULTY[q.difficulty].tone}>{DIFFICULTY[q.difficulty].label}</Badge>
                  </Td>
                  <Td className="text-right">{q.timesAsked}</Td>
                  <Td className={cn('text-right font-semibold', q.successRate !== null && q.successRate < 30 && 'text-tunisia')}>
                    {q.successRate === null ? '—' : `${q.successRate}%`}
                  </Td>
                  <Td>{q.active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</Td>
                  <Td className="whitespace-nowrap text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(q)} aria-label="Modifier">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-tunisia" onClick={() => setDeleting(q)} aria-label="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
        {questions.data && (
          <Pagination page={questions.data.page} pages={questions.data.pages} total={questions.data.total} onPage={setPage} />
        )}
      </Card>

      {importing && <QuizImportDialog onClose={() => setImporting(false)} />}
      {editing && <QuestionDialog question={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Supprimer la question"
        danger
        description={`« ${deleting?.question} » — si elle a déjà été jouée, elle sera seulement désactivée.`}
        confirmLabel="Supprimer"
        onConfirm={() => deleting && remove.mutateAsync(deleting.id)}
      />
    </div>
  )
}

function QuestionDialog({ question, onClose }: { question: QuizQuestion | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<QuestionInput>(() =>
    question
      ? {
          question: question.question,
          options: [...question.options, '', '', '', ''].slice(0, Math.max(question.options.length, 2)),
          correctIndex: question.correctIndex,
          category: question.category,
          difficulty: question.difficulty,
          active: question.active,
        }
      : EMPTY,
  )

  const save = useMutation({
    mutationFn: (body: QuestionInput) =>
      question ? api.put(`/admin/quiz/questions/${question.id}`, body) : api.post('/admin/quiz/questions', body),
    onSuccess: () => {
      toast.success(question ? 'Question mise à jour' : 'Question ajoutée')
      qc.invalidateQueries({ queryKey: ['quiz'] })
      onClose()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const options = form.options
  const filled = options.filter((o) => o.trim())
  const valid = form.question.trim().length >= 5 && filled.length >= 2 && options[form.correctIndex]?.trim()

  const submit = () => {
    // Drop empty options and keep the right answer pointing at the same text.
    const cleaned = options.map((o) => o.trim()).filter(Boolean)
    const correct = cleaned.indexOf(options[form.correctIndex].trim())
    save.mutate({ ...form, question: form.question.trim(), options: cleaned, correctIndex: correct })
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={question ? 'Modifier la question' : 'Nouvelle question'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" disabled={!valid} loading={save.isPending} onClick={submit}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Question">
          <Textarea dir="auto" rows={2} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
        </Field>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Réponses — coche la bonne</p>
          {options.map((option, i) => (
            <div key={i} className="flex items-center gap-3">
              <input
                type="radio"
                name="correct"
                className="h-4 w-4 cursor-pointer accent-blau"
                checked={form.correctIndex === i}
                onChange={() => setForm({ ...form, correctIndex: i })}
              />
              <Input
                dir="auto"
                value={option}
                placeholder={`Réponse ${i + 1}${i >= 2 ? ' (optionnelle)' : ''}`}
                onChange={(e) => {
                  const next = [...options]
                  next[i] = e.target.value
                  setForm({ ...form, options: next })
                }}
                className={cn(form.correctIndex === i && 'border-emerald-400 bg-emerald-50/50')}
              />
            </div>
          ))}
          {options.length < 4 && (
            <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, options: [...options, ''] })}>
              <Plus className="h-3.5 w-3.5" /> Ajouter une réponse
            </Button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Catégorie">
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} list="quiz-categories" />
            <datalist id="quiz-categories">
              {['histoire', 'joueurs', 'trophées', 'entraîneurs', 'matchs', 'stade', 'actualité'].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Difficulté">
            <Select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as QuestionInput['difficulty'] })}>
              <option value="easy">Facile</option>
              <option value="medium">Moyen</option>
              <option value="hard">Difficile</option>
            </Select>
          </Field>
          <div className="flex items-end pb-2">
            <Switch checked={form.active} onChange={(active) => setForm({ ...form, active })} label="Active" />
          </div>
        </div>
      </div>
    </Dialog>
  )
}

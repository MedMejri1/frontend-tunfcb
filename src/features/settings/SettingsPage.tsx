import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Field, Input, Switch } from '@/components/ui/form'
import { PageHeader } from '@/components/common'
import { api, apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Settings } from '@/lib/types'
import { formatNumber } from '@/lib/utils'

const DAYS = ['Jour 1', 'Jour 2', 'Jour 3', 'Jour 4', 'Jour 5', 'Jour 6', 'Jour 7']

export function SettingsPage() {
  const qc = useQueryClient()
  const { isSuperAdmin } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get<{ settings: Settings; defaults: Settings }>('/admin/settings')).data,
  })
  // Local edits; null means "showing the saved settings".
  const [draft, setForm] = useState<Settings | null>(null)
  const form = draft ?? data?.settings ?? null

  const save = useMutation({
    mutationFn: (settings: Settings) => api.put('/admin/settings', settings),
    onSuccess: async () => {
      toast.success('Règles enregistrées, appliquées immédiatement dans l’app')
      await qc.invalidateQueries({ queryKey: ['settings'] })
      setForm(null)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  if (isLoading || !form || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blau" />
      </div>
    )
  }

  const readOnly = !isSuperAdmin
  const dirty = JSON.stringify(form) !== JSON.stringify(data.settings)
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => setForm({ ...form, [key]: value })
  const num = (v: string) => (v === '' ? 0 : Number(v))
  const totalWeight = form.wheel.segments.reduce((s, seg) => s + seg.weight, 0) || 1
  const expectedWheel = form.wheel.segments.reduce((s, seg) => s + (seg.points * seg.weight) / totalWeight, 0)

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Règles & récompenses"
        description="Économie des points : chaque modification s'applique immédiatement dans l'application."
        actions={
          !readOnly && (
            <>
              <Button variant="outline" onClick={() => setForm({ ...structuredClone(data.defaults), shop: form.shop })}>
                <RotateCcw className="h-4 w-4" /> Valeurs par défaut
              </Button>
              <Button variant="primary" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate(form)}>
                <Save className="h-4 w-4" /> Enregistrer
              </Button>
            </>
          )
        }
      />

      {readOnly && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Lecture seule : seul un super administrateur peut modifier les règles du jeu.
        </p>
      )}

      <fieldset disabled={readOnly} className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader title="Bonus quotidien" description="Récompense de chaque jour de la série (cycle de 7 jours)" />
            <CardContent className="grid grid-cols-4 gap-3 sm:grid-cols-7">
              {form.streakRewards.map((r, i) => (
                <Field key={i} label={DAYS[i]}>
                  <Input
                    type="number"
                    min={0}
                    className="px-1.5 text-center"
                    value={r}
                    onChange={(e) => {
                      const next = [...form.streakRewards]
                      next[i] = num(e.target.value)
                      update('streakRewards', next)
                    }}
                  />
                </Field>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Quiz du jour" />
            <CardContent className="grid grid-cols-2 gap-4">
              <Field label="Questions par quiz">
                <Input type="number" min={1} max={20} value={form.quiz.questionsPerQuiz} onChange={(e) => update('quiz', { ...form.quiz, questionsPerQuiz: num(e.target.value) })} />
              </Field>
              <Field label="BP par bonne réponse">
                <Input type="number" min={0} value={form.quiz.pointsPerCorrect} onChange={(e) => update('quiz', { ...form.quiz, pointsPerCorrect: num(e.target.value) })} />
              </Field>
              <Field label="Bonus sans faute (BP)">
                <Input type="number" min={0} value={form.quiz.perfectBonus} onChange={(e) => update('quiz', { ...form.quiz, perfectBonus: num(e.target.value) })} />
              </Field>
              <Field label="Secondes par question">
                <Input type="number" min={5} max={120} value={form.quiz.secondsPerQuestion} onChange={(e) => update('quiz', { ...form.quiz, secondsPerQuestion: num(e.target.value) })} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Pronostics" />
            <CardContent className="grid grid-cols-2 gap-4">
              <Field label="Score exact (BP)">
                <Input type="number" min={0} value={form.predictions.exactScorePoints} onChange={(e) => update('predictions', { ...form.predictions, exactScorePoints: num(e.target.value) })} />
              </Field>
              <Field label="Bon résultat (BP)" hint="Victoire / nul / défaite trouvé">
                <Input type="number" min={0} value={form.predictions.correctOutcomePoints} onChange={(e) => update('predictions', { ...form.predictions, correctOutcomePoints: num(e.target.value) })} />
              </Field>
              <Field label="Fermeture avant le coup d'envoi (min)">
                <Input type="number" min={0} value={form.predictions.closeMinutesBeforeKickoff} onChange={(e) => update('predictions', { ...form.predictions, closeMinutesBeforeKickoff: num(e.target.value) })} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Publicités récompensées & parrainage" />
            <CardContent className="grid grid-cols-2 gap-4">
              <Field label="BP par publicité">
                <Input type="number" min={0} value={form.ads.rewardPerAd} onChange={(e) => update('ads', { ...form.ads, rewardPerAd: num(e.target.value) })} />
              </Field>
              <Field label="Publicités max / jour">
                <Input type="number" min={0} value={form.ads.maxPerDay} onChange={(e) => update('ads', { ...form.ads, maxPerDay: num(e.target.value) })} />
              </Field>
              <Field label="Délai entre 2 pubs (s)">
                <Input type="number" min={0} value={form.ads.cooldownSeconds} onChange={(e) => update('ads', { ...form.ads, cooldownSeconds: num(e.target.value) })} />
              </Field>
              <div />
              <Field label="Parrain (BP)">
                <Input type="number" min={0} value={form.referral.referrerPoints} onChange={(e) => update('referral', { ...form.referral, referrerPoints: num(e.target.value) })} />
              </Field>
              <Field label="Filleul (BP)" hint="Bonus de bienvenue">
                <Input type="number" min={0} value={form.referral.refereePoints} onChange={(e) => update('referral', { ...form.referral, refereePoints: num(e.target.value) })} />
              </Field>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader
            title="Emplacements publicitaires"
            description="Où l’application affiche des pubs. Les changements s’appliquent au prochain lancement de l’app."
          />
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="space-y-3">
              <Switch
                label="Doubler mes gains"
                checked={form.ads.doubleRewards}
                disabled={readOnly}
                onChange={(doubleRewards) => update('ads', { ...form.ads, doubleRewards })}
              />
              <p className="text-xs text-slate-500">
                Après le quiz et la roue, le joueur peut regarder une vidéo pour recevoir ses points une deuxième fois (une seule fois par partie).
              </p>
            </div>
            <div className="space-y-3">
              <Switch
                label="Pub plein écran à la fermeture d’un article"
                checked={form.ads.interstitial.enabled}
                disabled={readOnly}
                onChange={(enabled) => update('ads', { ...form.ads, interstitial: { ...form.ads.interstitial, enabled } })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tous les N articles">
                  <Input type="number" min={1} max={20} value={form.ads.interstitial.everyArticles} onChange={(e) => update('ads', { ...form.ads, interstitial: { ...form.ads.interstitial, everyArticles: num(e.target.value) } })} />
                </Field>
                <Field label="Intervalle min. (min)">
                  <Input type="number" min={0} max={240} value={form.ads.interstitial.minIntervalMinutes} onChange={(e) => update('ads', { ...form.ads, interstitial: { ...form.ads.interstitial, minIntervalMinutes: num(e.target.value) } })} />
                </Field>
              </div>
            </div>
            <div className="space-y-3">
              <Switch
                label="Pub native dans les actualités"
                checked={form.ads.nativeFeed.enabled}
                disabled={readOnly}
                onChange={(enabled) => update('ads', { ...form.ads, nativeFeed: { ...form.ads.nativeFeed, enabled } })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Après l’actualité n°">
                  <Input type="number" min={1} max={20} value={form.ads.nativeFeed.firstPosition} onChange={(e) => update('ads', { ...form.ads, nativeFeed: { ...form.ads.nativeFeed, firstPosition: num(e.target.value) } })} />
                </Field>
                <Field label="Puis toutes les N">
                  <Input type="number" min={2} max={30} value={form.ads.nativeFeed.interval} onChange={(e) => update('ads', { ...form.ads, nativeFeed: { ...form.ads.nativeFeed, interval: num(e.target.value) } })} />
                </Field>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Roue de la chance"
            description={`Gain moyen par tour ≈ ${formatNumber(Math.round(expectedWheel))} BP. La probabilité de chaque lot est proportionnelle à son poids.`}
            action={
              <Field label="Délai entre 2 tours (h)" className="w-44">
                <Input type="number" min={0} value={form.wheel.cooldownHours} onChange={(e) => update('wheel', { ...form.wheel, cooldownHours: num(e.target.value) })} />
              </Field>
            }
          />
          <CardContent className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_1fr_80px_90px_40px] gap-3 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <span>Libellé</span>
              <span>Points</span>
              <span>Poids</span>
              <span>Couleur</span>
              <span className="text-right">Chance</span>
              <span />
            </div>
            {form.wheel.segments.map((seg, i) => {
              const setSeg = (patch: Partial<typeof seg>) => {
                const segments = [...form.wheel.segments]
                segments[i] = { ...seg, ...patch }
                update('wheel', { ...form.wheel, segments })
              }
              return (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_80px_90px_40px] items-center gap-3">
                  <Input value={seg.label} maxLength={20} onChange={(e) => setSeg({ label: e.target.value })} />
                  <Input type="number" min={0} value={seg.points} onChange={(e) => setSeg({ points: num(e.target.value) })} />
                  <Input type="number" min={0} value={seg.weight} onChange={(e) => setSeg({ weight: num(e.target.value) })} />
                  <input
                    type="color"
                    value={seg.color}
                    onChange={(e) => setSeg({ color: e.target.value.toUpperCase() })}
                    className="h-10 w-full cursor-pointer rounded-lg border border-slate-200"
                  />
                  <span className="text-right text-sm font-bold text-navy-900">{((seg.weight / totalWeight) * 100).toFixed(1)}%</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-tunisia"
                    disabled={form.wheel.segments.length <= 2}
                    onClick={() => update('wheel', { ...form.wheel, segments: form.wheel.segments.filter((_, j) => j !== i) })}
                    aria-label="Retirer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
            {form.wheel.segments.length < 12 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  update('wheel', {
                    ...form.wheel,
                    segments: [...form.wheel.segments, { label: 'Nouveau lot', points: 10, weight: 5, color: '#1E4CAB' }],
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter un lot
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Notifications push automatiques"
            description="Envoyées sur les téléphones des supporters (heure de Tunis). Chaque supporter peut couper les alertes match ou les rappels de jeux dans ses réglages."
          />
          <CardContent className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-3">
              <Switch
                label="Avant le match"
                checked={form.push.matchReminder.enabled}
                disabled={readOnly}
                onChange={(enabled) => update('push', { ...form.push, matchReminder: { ...form.push.matchReminder, enabled } })}
              />
              <Field label="Minutes avant le coup d'envoi">
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={form.push.matchReminder.minutesBefore}
                  onChange={(e) => update('push', { ...form.push, matchReminder: { ...form.push.matchReminder, minutesBefore: num(e.target.value) } })}
                />
              </Field>
            </div>
            <div className="space-y-3">
              <Switch
                label="Fin du match"
                checked={form.push.matchEnd.enabled}
                disabled={readOnly}
                onChange={(enabled) => update('push', { ...form.push, matchEnd: { enabled } })}
              />
              <p className="text-xs text-slate-500">Score final et rappel des points de pronostic, dès que le match est terminé.</p>
            </div>
            <div className="space-y-3">
              <Switch
                label="Rappel du matin"
                checked={form.push.morning.enabled}
                disabled={readOnly}
                onChange={(enabled) => update('push', { ...form.push, morning: { ...form.push.morning, enabled } })}
              />
              <Field label="Heure" hint="Bonus, quiz, roue, pubs (+ pronostic les jours de match)">
                <Input type="time" value={form.push.morning.time} onChange={(e) => update('push', { ...form.push, morning: { ...form.push.morning, time: e.target.value } })} />
              </Field>
            </div>
            <div className="space-y-3">
              <Switch
                label="Rappel du soir"
                checked={form.push.evening.enabled}
                disabled={readOnly}
                onChange={(enabled) => update('push', { ...form.push, evening: { ...form.push.evening, enabled } })}
              />
              <Field label="Heure" hint="Seulement à ceux à qui il reste des jeux du jour">
                <Input type="time" value={form.push.evening.time} onChange={(e) => update('push', { ...form.push, evening: { ...form.push.evening, time: e.target.value } })} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Niveaux" description="XP total requis pour atteindre chaque niveau (seuils croissants, le premier à 0)" />
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {form.levels.map((lvl, i) => (
              <div key={lvl.level} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blau to-grana text-sm font-black text-white">
                  {lvl.level}
                </span>
                <Input
                  value={lvl.name}
                  onChange={(e) => {
                    const levels = [...form.levels]
                    levels[i] = { ...lvl, name: e.target.value }
                    update('levels', levels)
                  }}
                />
                <Input
                  type="number"
                  className="w-28"
                  min={0}
                  disabled={i === 0}
                  value={lvl.minXp}
                  onChange={(e) => {
                    const levels = [...form.levels]
                    levels[i] = { ...lvl, minXp: num(e.target.value) }
                    update('levels', levels)
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </fieldset>

      {!readOnly && dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:pl-72">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Modifications non enregistrées</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setForm(null)}>
                Annuler
              </Button>
              <Button variant="primary" loading={save.isPending} onClick={() => save.mutate(form)}>
                <Save className="h-4 w-4" /> Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

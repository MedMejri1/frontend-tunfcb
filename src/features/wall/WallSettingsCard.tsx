import { useState } from 'react'
import { MessagesSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, Input, Switch } from '@/components/ui/form'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { useSaveWallSettings } from './api'
import type { WallSettings } from './types'

/** Open/close the wall and set its limits (super admin only). */
export function WallSettingsCard({ wall }: { wall: WallSettings }) {
  const { isSuperAdmin } = useAuth()
  const save = useSaveWallSettings()
  const [draft, setDraft] = useState<{ maxPosts: string; autoHide: string } | null>(null)
  const form = draft ?? { maxPosts: String(wall.maxPostsPerDay), autoHide: String(wall.autoHideReports) }

  const values = (): WallSettings => ({
    ...wall,
    maxPostsPerDay: Math.max(1, Number(form.maxPosts) || 1),
    autoHideReports: Math.max(0, Number(form.autoHide) || 0),
  })

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-6 py-5">
        <div className="flex min-w-64 flex-1 items-center gap-4">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl',
              wall.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
            )}
          >
            <MessagesSquare className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-navy-900">
              {wall.enabled ? 'Mur ouvert : les supporters publient et commentent' : 'Mur fermé : l’app affiche « Bientôt disponible »'}
            </p>
            <Switch
              checked={wall.enabled}
              disabled={!isSuperAdmin || save.isPending}
              onChange={(enabled) => save.mutate({ ...values(), enabled }, { onSuccess: () => setDraft(null) })}
              label={wall.enabled ? 'Ouvert' : 'Fermé'}
            />
          </div>
        </div>
        <fieldset disabled={!isSuperAdmin} className="flex flex-wrap items-end gap-3">
          <Field label="Publications / jour" hint="Par supporter" className="w-40">
            <Input inputMode="numeric" value={form.maxPosts} onChange={(e) => setDraft({ ...form, maxPosts: e.target.value })} />
          </Field>
          <Field label="Masquage auto" hint="Signalements (0 = jamais)" className="w-44">
            <Input inputMode="numeric" value={form.autoHide} onChange={(e) => setDraft({ ...form, autoHide: e.target.value })} />
          </Field>
          {draft && (
            <Button
              variant="primary"
              loading={save.isPending}
              onClick={() => save.mutate(values(), { onSuccess: () => setDraft(null) })}
              className="mb-5"
            >
              Enregistrer
            </Button>
          )}
        </fieldset>
      </CardContent>
    </Card>
  )
}

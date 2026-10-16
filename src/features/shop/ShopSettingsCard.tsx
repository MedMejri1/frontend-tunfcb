import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, Input, Switch } from '@/components/ui/form'
import { api, apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { ShopSettings } from '@/lib/types'
import { cn, dtToMillimes, millimesToDt } from '@/lib/utils'

/** Open/close the shop and set the delivery rules (super admin only). */
export function ShopSettingsCard({ shop }: { shop: ShopSettings }) {
  const qc = useQueryClient()
  const { isSuperAdmin } = useAuth()
  const [draft, setDraft] = useState<{ fee: string; freeFrom: string; maxQty: string } | null>(null)
  const form = draft ?? {
    fee: millimesToDt(shop.shippingFee),
    freeFrom: millimesToDt(shop.freeShippingFrom),
    maxQty: String(shop.maxQuantityPerItem),
  }

  const save = useMutation({
    mutationFn: (next: ShopSettings) => api.put('/admin/shop/settings', next),
    onSuccess: (_res, next) => {
      toast.success(next.enabled !== shop.enabled ? (next.enabled ? 'Boutique ouverte dans l’app' : 'Boutique fermée : « Bientôt disponible »') : 'Réglages enregistrés')
      setDraft(null)
      qc.invalidateQueries({ queryKey: ['shop'] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const values = (): ShopSettings => ({
    ...shop,
    shippingFee: dtToMillimes(form.fee || 0),
    freeShippingFrom: dtToMillimes(form.freeFrom || 0),
    maxQuantityPerItem: Number(form.maxQty) || 1,
  })

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-6 py-5">
        <div className="flex min-w-64 flex-1 items-center gap-4">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', shop.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600')}>
            <Store className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-navy-900">
              {shop.enabled ? 'Boutique ouverte : les supporters peuvent commander' : 'Boutique fermée : l’app affiche « Bientôt disponible »'}
            </p>
            <Switch
              checked={shop.enabled}
              disabled={!isSuperAdmin || save.isPending}
              onChange={(enabled) => save.mutate({ ...values(), enabled })}
              label={shop.enabled ? 'Ouverte' : 'Fermée'}
            />
          </div>
        </div>
        <fieldset disabled={!isSuperAdmin} className="flex flex-wrap items-end gap-3">
          <Field label="Livraison (DT)" className="w-32">
            <Input inputMode="decimal" value={form.fee} onChange={(e) => setDraft({ ...form, fee: e.target.value })} />
          </Field>
          <Field label="Gratuite dès (DT)" hint="0 = jamais" className="w-36">
            <Input inputMode="decimal" value={form.freeFrom} onChange={(e) => setDraft({ ...form, freeFrom: e.target.value })} />
          </Field>
          <Field label="Max / article" className="w-28">
            <Input inputMode="numeric" value={form.maxQty} onChange={(e) => setDraft({ ...form, maxQty: e.target.value })} />
          </Field>
          {draft && (
            <Button variant="primary" loading={save.isPending} onClick={() => save.mutate(values())} className="mb-5">
              Enregistrer
            </Button>
          )}
        </fieldset>
      </CardContent>
    </Card>
  )
}

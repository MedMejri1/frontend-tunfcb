import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ImagePlus, Loader2, Star, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/form'
import { api, apiErrorMessage, assetUrl } from '@/lib/api'
import { PRODUCT_CATEGORIES } from '@/lib/labels'
import type { Product, ProductCategory, ProductStatus } from '@/lib/types'
import { cn, dtToMillimes, millimesToDt } from '@/lib/utils'

const ADULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL']
const MAX_IMAGES = 8

interface FormState {
  name: string
  description: string
  category: ProductCategory
  price: string
  stock: string
  sizes: string[]
  images: string[]
  featured: boolean
  status: ProductStatus
}

const toForm = (p?: Product): FormState => ({
  name: p?.name ?? '',
  description: p?.description ?? '',
  category: p?.category ?? 'maillots',
  price: p ? millimesToDt(p.price) : '',
  stock: p?.stock == null ? '' : String(p.stock),
  sizes: p?.sizes ?? [],
  images: p?.images ?? [],
  featured: p?.featured ?? false,
  status: p?.status === 'archived' ? 'draft' : (p?.status ?? 'draft'),
})

export function ProductDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<FormState>(() => toForm(product ?? undefined))
  const [sizeInput, setSizeInput] = useState('')
  const [uploading, setUploading] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  const price = dtToMillimes(form.price)
  const priceValid = form.price.trim() !== '' && Number.isFinite(price) && price >= 0
  const stockValid = form.stock.trim() === '' || /^\d+$/.test(form.stock.trim())
  const valid = form.name.trim().length >= 2 && priceValid && stockValid && uploading === 0

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        price,
        stock: form.stock.trim() === '' ? null : Number(form.stock),
        sizes: form.sizes,
        images: form.images,
        featured: form.featured,
        status: form.status,
      }
      return product ? api.patch(`/admin/shop/products/${product.id}`, body) : api.post('/admin/shop/products', body)
    },
    onSuccess: () => {
      toast.success(product ? 'Article mis à jour' : form.status === 'published' ? 'Article publié dans l’app' : 'Brouillon enregistré')
      qc.invalidateQueries({ queryKey: ['shop'] })
      onClose()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const upload = async (files: FileList | null) => {
    const list = Array.from(files ?? []).slice(0, MAX_IMAGES - form.images.length)
    for (const file of list) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} : 5 Mo maximum`)
        continue
      }
      setUploading((n) => n + 1)
      try {
        const { data } = await api.post<{ url: string }>('/admin/shop/uploads', file, {
          headers: { 'Content-Type': file.type },
        })
        setForm((f) => ({ ...f, images: [...f.images, data.url] }))
      } catch (err) {
        toast.error(apiErrorMessage(err))
      } finally {
        setUploading((n) => n - 1)
      }
    }
    if (fileInput.current) fileInput.current.value = ''
  }

  const addSize = (size: string) => {
    const value = size.trim().toUpperCase()
    if (value && !form.sizes.includes(value)) set({ sizes: [...form.sizes, value] })
    setSizeInput('')
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      size="lg"
      title={product ? 'Modifier l’article' : 'Nouvel article'}
      description="Prix en dinars. Un article publié apparaît dans la boutique de l’app."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" disabled={!valid} loading={save.isPending} onClick={() => save.mutate()}>
            {form.status === 'published' ? 'Publier' : 'Enregistrer le brouillon'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Photos · la première est la photo principale
          </p>
          <div className="grid grid-cols-4 gap-3">
            {form.images.map((url, i) => (
              <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <img src={assetUrl(url)} alt="" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded bg-navy-900/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    Principale
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  {i > 0 && (
                    <button
                      type="button"
                      title="Photo principale"
                      className="cursor-pointer rounded bg-white/90 p-1 text-slate-700"
                      onClick={() => set({ images: [url, ...form.images.filter((u) => u !== url)] })}
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Retirer"
                    className="cursor-pointer rounded bg-white/90 p-1 text-tunisia"
                    onClick={() => set({ images: form.images.filter((u) => u !== url) })}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {form.images.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-blau hover:text-blau"
              >
                {uploading > 0 ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
                <span className="text-xs font-semibold">{uploading > 0 ? 'Envoi…' : 'Ajouter'}</span>
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(e) => void upload(e.target.files)}
          />
        </div>

        <Field label="Nom de l’article">
          <Input value={form.name} placeholder="Maillot domicile 2026/27" onChange={(e) => set({ name: e.target.value })} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Catégorie">
            <Select value={form.category} onChange={(e) => set({ category: e.target.value as ProductCategory })}>
              {Object.entries(PRODUCT_CATEGORIES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prix (DT)" error={form.price && !priceValid ? 'Prix invalide' : undefined}>
            <Input inputMode="decimal" value={form.price} placeholder="199" onChange={(e) => set({ price: e.target.value })} />
          </Field>
          <Field label="Stock" hint="Vide = illimité" error={!stockValid ? 'Nombre entier attendu' : undefined}>
            <Input inputMode="numeric" value={form.stock} placeholder="∞" onChange={(e) => set({ stock: e.target.value })} />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Tailles · vide = taille unique</p>
          <div className="flex flex-wrap items-center gap-2">
            {form.sizes.map((size) => (
              <span key={size} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blau">
                {size}
                <button type="button" className="cursor-pointer" onClick={() => set({ sizes: form.sizes.filter((s) => s !== size) })}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <Input
              className="h-8 w-28"
              value={sizeInput}
              placeholder="Ajouter…"
              onChange={(e) => setSizeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  addSize(sizeInput)
                }
              }}
              onBlur={() => sizeInput && addSize(sizeInput)}
            />
            <Button variant="ghost" size="sm" onClick={() => set({ sizes: [...new Set([...form.sizes, ...ADULT_SIZES])] })}>
              S → XXL
            </Button>
          </div>
        </div>

        <Field label="Description">
          <Textarea
            rows={4}
            value={form.description}
            placeholder="Matière, coupe, conseils de taille…"
            onChange={(e) => set({ description: e.target.value })}
          />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-slate-50 px-4 py-3">
          <Switch checked={form.featured} onChange={(featured) => set({ featured })} label="Mettre en avant (en tête de la boutique)" />
          <div className="inline-flex rounded-lg bg-white p-1 shadow-sm">
            {(['draft', 'published'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => set({ status })}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold',
                  form.status === status ? (status === 'published' ? 'bg-emerald-600 text-white' : 'bg-navy-900 text-white') : 'text-slate-500',
                )}
              >
                {status === 'published' ? 'Publié' : 'Brouillon'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  )
}

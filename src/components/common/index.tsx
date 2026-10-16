import { useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { cn, initials } from '@/lib/utils'

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon: LucideIcon
  tone?: 'blau' | 'grana' | 'gold' | 'green' | 'red' | 'violet'
}

const TONES = {
  blau: 'bg-blue-50 text-blau',
  grana: 'bg-pink-50 text-grana',
  gold: 'bg-amber-50 text-amber-600',
  green: 'bg-emerald-50 text-emerald-600',
  red: 'bg-red-50 text-tunisia',
  violet: 'bg-violet-50 text-violet-600',
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'blau' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-extrabold text-navy-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <span className={cn('rounded-lg p-2', TONES[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  )
}

/** Flag image (Windows can't render flag emojis). */
export function CountryFlag({ code, className }: { code?: string; className?: string }) {
  if (!code) return null
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt={code}
      loading="lazy"
      className={cn('mr-1 inline-block h-3 w-[18px] rounded-[2px] object-cover align-[-1px] shadow-sm', className)}
    />
  )
}

const GRADIENTS = [
  'from-blau to-grana',
  'from-grana to-tunisia',
  'from-navy-700 to-blau',
  'from-amber-500 to-grana',
  'from-emerald-600 to-blau',
  'from-violet-600 to-grana',
]

export function UserAvatar({ name, seed, size = 'md' }: { name: string; seed?: string; size?: 'sm' | 'md' | 'lg' }) {
  const key = seed ?? name
  const gradient = GRADIENTS[[...key].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTS.length]
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-xl' }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white',
        gradient,
        sizes[size],
      )}
    >
      {initials(name) || '?'}
    </span>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  danger?: boolean
  onConfirm: () => unknown
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, danger, onConfirm }: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false)
  const confirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={confirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-slate-600">{description}</div>
    </Dialog>
  )
}

export function EmptyState({ icon: Icon, title, message }: { icon: LucideIcon; title: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="rounded-full bg-slate-100 p-3 text-slate-400">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-700">{title}</p>
      {message && <p className="mt-1 max-w-sm text-xs text-slate-500">{message}</p>}
    </div>
  )
}

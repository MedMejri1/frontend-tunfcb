import type { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', {
  variants: {
    tone: {
      slate: 'bg-slate-100 text-slate-700',
      blue: 'bg-blue-50 text-blau',
      green: 'bg-emerald-50 text-emerald-700',
      red: 'bg-red-50 text-tunisia',
      gold: 'bg-amber-50 text-amber-700',
      grana: 'bg-pink-50 text-grana',
      violet: 'bg-violet-50 text-violet-700',
    },
  },
  defaultVariants: { tone: 'slate' },
})

export function Badge({
  tone,
  className,
  children,
}: VariantProps<typeof badgeVariants> & { className?: string; children: ReactNode }) {
  return <span className={cn(badgeVariants({ tone }), className)}>{children}</span>
}

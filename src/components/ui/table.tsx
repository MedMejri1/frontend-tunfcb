import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-sm', className)} {...props} />
    </div>
  )
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap',
        className,
      )}
      {...props}
    />
  )
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-b border-slate-100 px-4 py-3 align-middle', className)} {...props} />
}

export function Tr({ className, onClick, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(onClick && 'cursor-pointer hover:bg-slate-50', 'transition-colors', className)}
      onClick={onClick}
      {...props}
    />
  )
}

/** Loading / empty placeholder spanning a whole table. */
export function TableState({ colSpan, loading, empty }: { colSpan: number; loading?: boolean; empty?: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-slate-400">
        {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-blau" /> : (empty ?? 'Aucun résultat')}
      </td>
    </tr>
  )
}

interface PaginationProps {
  page: number
  pages: number
  total: number
  onPage: (page: number) => void
}

export function Pagination({ page, pages, total, onPage }: PaginationProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-xs text-slate-500">
      <span>
        {total.toLocaleString('fr-FR')} résultat{total > 1 ? 's' : ''}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Page précédente">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-16 text-center font-semibold text-slate-700">
          {page} / {pages}
        </span>
        <Button variant="outline" size="icon" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Page suivante">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

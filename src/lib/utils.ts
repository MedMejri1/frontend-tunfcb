import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const numberFormat = new Intl.NumberFormat('fr-FR')
export const formatNumber = (n: number | null | undefined) => (n == null ? '—' : numberFormat.format(n))

/** Shop amounts are stored in millimes (1 DT = 1000). */
export const formatDt = (millimes: number) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(millimes / 1000)} DT`
export const dtToMillimes = (dt: string | number) => Math.round(Number(String(dt).replace(',', '.')) * 1000)
export const millimesToDt = (millimes: number) => String(millimes / 1000)

export const formatPoints = (n: number) => `${n > 0 ? '+' : ''}${numberFormat.format(n)}`

const dateTimeFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })

export const formatDateTime = (value?: string | Date | null) => (value ? dateTimeFormat.format(new Date(value)) : '—')
export const formatDate = (value?: string | Date | null) => (value ? dateFormat.format(new Date(value)) : '—')

const relative = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' })

export function timeAgo(value?: string | Date | null): string {
  if (!value) return 'jamais'
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 60) return relative.format(seconds, 'second')
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour')
  if (abs < 86400 * 30) return relative.format(Math.round(seconds / 86400), 'day')
  return formatDate(value)
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

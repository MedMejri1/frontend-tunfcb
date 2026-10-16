import { useState } from 'react'
import { Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Official logo from /public/logo.png, with a placeholder until the file exists. */
export function Logo({ className }: { className?: string }) {
  const [missing, setMissing] = useState(false)
  if (missing) {
    return (
      <div className={cn('flex items-center justify-center rounded-xl bg-gradient-to-br from-blau to-grana', className)}>
        <Shield className="h-1/2 w-1/2 text-gold-light" />
      </div>
    )
  }
  return (
    <img
      src="/logo.png"
      alt="Tunfcb"
      className={cn('object-contain', className)}
      onError={() => setMissing(true)}
    />
  )
}

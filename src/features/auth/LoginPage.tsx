import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/form'
import { Logo } from '@/components/common/Logo'
import { apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { admin, login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  if (admin) return <Navigate to="/" replace />

  const onSubmit = async (values: FormValues) => {
    setError(null)
    try {
      await login(values.email, values.password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy-900 lg:block">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,#004d98_0_120px,#a50044_120px_240px)] opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900/40 via-navy-900/70 to-navy-950" />
        <div className="relative flex h-full flex-col items-center justify-center px-12 text-center text-white">
          <Logo className="h-40 w-40 drop-shadow-2xl" />
          <h1 className="mt-8 text-4xl font-extrabold tracking-tight">
            TUN<span className="text-gold">FCB</span>
          </h1>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.3em] text-white/60">Més que un club</p>
          <p className="mt-10 max-w-sm text-sm text-white/70">
            Gère les supporters, les jeux, les points et le classement de l'application depuis un seul endroit.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Logo className="mx-auto mb-6 h-20 w-20 lg:hidden" />
          <h2 className="text-2xl font-extrabold text-navy-900">Connexion</h2>
          <p className="mt-1 text-sm text-slate-500">Espace réservé aux administrateurs.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <Field label="Email" error={errors.email?.message}>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input type="email" autoComplete="email" className="pl-9" placeholder="admin@barca.app" {...register('email')} />
              </div>
            </Field>
            <Field label="Mot de passe" error={errors.password?.message}>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input type="password" autoComplete="current-password" className="pl-9" {...register('password')} />
              </div>
            </Field>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-tunisia">{error}</p>}
            <Button type="submit" variant="primary" className="w-full" loading={isSubmitting}>
              Se connecter
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

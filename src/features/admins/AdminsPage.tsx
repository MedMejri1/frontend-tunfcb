import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { KeyRound, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select, Switch } from '@/components/ui/form'
import { Table, TableState, Td, Th, Tr } from '@/components/ui/table'
import { ConfirmDialog, PageHeader, UserAvatar } from '@/components/common'
import { api, apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Admin, AdminRole } from '@/lib/types'
import { timeAgo } from '@/lib/utils'

export function AdminsPage() {
  const qc = useQueryClient()
  const { admin: me } = useAuth()
  const [creating, setCreating] = useState(false)
  const [resetting, setResetting] = useState<Admin | null>(null)
  const [deleting, setDeleting] = useState<Admin | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: async () => (await api.get<{ items: Admin[] }>('/admin/admins')).data.items,
  })

  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: string; role?: AdminRole; active?: boolean; password?: string }) =>
      api.patch(`/admin/admins/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admins'] }),
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/admins/${id}`),
    onSuccess: () => {
      toast.success('Administrateur supprimé')
      qc.invalidateQueries({ queryKey: ['admins'] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  return (
    <div>
      <PageHeader
        title="Administrateurs"
        description="Les administrateurs gèrent les supporters et les jeux ; seuls les super administrateurs modifient les règles et l'équipe."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        }
      />
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Administrateur</Th>
              <Th>Rôle</Th>
              <Th>Actif</Th>
              <Th>Dernière connexion</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {isLoading || !data ? (
              <TableState colSpan={5} loading />
            ) : (
              data.map((a) => {
                const isMe = a.id === me?.id
                return (
                  <Tr key={a.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={a.name} seed={a.id} size="sm" />
                        <div>
                          <p className="font-semibold text-slate-800">
                            {a.name} {isMe && <Badge tone="blue">Vous</Badge>}
                          </p>
                          <p className="text-xs text-slate-500">{a.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Select
                        className="h-8 w-44 text-xs"
                        value={a.role}
                        disabled={isMe}
                        onChange={(e) => update.mutate({ id: a.id, role: e.target.value as AdminRole })}
                      >
                        <option value="admin">Administrateur</option>
                        <option value="super_admin">Super administrateur</option>
                      </Select>
                    </Td>
                    <Td>
                      <Switch checked={a.active} disabled={isMe} onChange={(active) => update.mutate({ id: a.id, active })} />
                    </Td>
                    <Td className="text-slate-500">{timeAgo(a.lastLoginAt)}</Td>
                    <Td className="whitespace-nowrap text-right">
                      <Button variant="ghost" size="icon" onClick={() => setResetting(a)} aria-label="Mot de passe">
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      {!isMe && (
                        <Button variant="ghost" size="icon" className="text-tunisia" onClick={() => setDeleting(a)} aria-label="Supprimer">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </Td>
                  </Tr>
                )
              })
            )}
          </tbody>
        </Table>
      </Card>

      {creating && <CreateAdminDialog onClose={() => setCreating(false)} />}
      {resetting && (
        <PasswordDialog
          admin={resetting}
          onClose={() => setResetting(null)}
          onSave={async (password) => {
            await update.mutateAsync({ id: resetting.id, password })
            toast.success('Mot de passe mis à jour')
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Supprimer l'administrateur"
        danger
        description={`${deleting?.name} n'aura plus accès au tableau de bord.`}
        confirmLabel="Supprimer"
        onConfirm={() => deleting && remove.mutateAsync(deleting.id)}
      />
    </div>
  )
}

function CreateAdminDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'admin' as AdminRole })
  const create = useMutation({
    mutationFn: () => api.post('/admin/admins', form),
    onSuccess: () => {
      toast.success('Administrateur créé')
      qc.invalidateQueries({ queryKey: ['admins'] })
      onClose()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })
  const valid = form.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email) && form.password.length >= 8

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Nouvel administrateur"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" disabled={!valid} loading={create.isPending} onClick={() => create.mutate()}>
            Créer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nom">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Mot de passe" hint="8 caractères minimum">
          <Input type="text" autoComplete="off" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <Field label="Rôle">
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}>
            <option value="admin">Administrateur</option>
            <option value="super_admin">Super administrateur</option>
          </Select>
        </Field>
      </div>
    </Dialog>
  )
}

function PasswordDialog({ admin, onClose, onSave }: { admin: Admin; onClose: () => void; onSave: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Mot de passe de ${admin.name}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            disabled={password.length < 8}
            loading={saving}
            onClick={async () => {
              setSaving(true)
              try {
                await onSave(password)
                onClose()
              } finally {
                setSaving(false)
              }
            }}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <Field label="Nouveau mot de passe" hint="8 caractères minimum">
        <Input type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
    </Dialog>
  )
}

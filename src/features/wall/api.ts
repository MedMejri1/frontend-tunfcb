import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, apiErrorMessage } from '@/lib/api'
import type { ModerationAction, WallPostDetail, WallSettings, WallSummary } from './types'

export const WALL_KEY = ['wall'] as const

/** Header figures and the sidebar badge (posts with reports to review). */
export const useWallSummary = () =>
  useQuery({
    queryKey: [...WALL_KEY, 'summary'],
    queryFn: async () => (await api.get<WallSummary>('/admin/wall/summary')).data,
    refetchInterval: 60_000,
  })

export const useWallPost = (id: string | null) =>
  useQuery({
    queryKey: [...WALL_KEY, 'post', id],
    queryFn: async () => (await api.get<WallPostDetail>(`/admin/wall/posts/${id}`)).data,
    enabled: !!id,
  })

/** Every wall mutation refreshes the lists, the open post and the badge. */
function useWallMutation<T>(fn: (input: T) => Promise<unknown>, success: string | ((input: T) => string)) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (_res, input) => {
      toast.success(typeof success === 'string' ? success : success(input))
      qc.invalidateQueries({ queryKey: WALL_KEY })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })
}

const MODERATION_DONE: Record<ModerationAction, string> = {
  hide: 'Masqué : plus visible dans l’app',
  restore: 'Rétabli sur le mur',
  dismiss: 'Signalements ignorés',
}

export const useModeratePost = () =>
  useWallMutation(
    ({ id, action }: { id: string; action: ModerationAction }) => api.post(`/admin/wall/posts/${id}/moderate`, { action }),
    ({ action }) => MODERATION_DONE[action],
  )

export const useModerateComment = () =>
  useWallMutation(
    ({ id, action }: { id: string; action: ModerationAction }) => api.post(`/admin/wall/comments/${id}/moderate`, { action }),
    ({ action }) => MODERATION_DONE[action],
  )

export const useDeleteWallPost = () =>
  useWallMutation((id: string) => api.delete(`/admin/wall/posts/${id}`), 'Publication supprimée')

export const useDeleteWallComment = () =>
  useWallMutation((id: string) => api.delete(`/admin/wall/comments/${id}`), 'Commentaire supprimé')

export const useBlockFromWall = () =>
  useWallMutation(
    ({ userId, blocked }: { userId: string; blocked: boolean }) => api.post(`/admin/wall/users/${userId}/block`, { blocked }),
    ({ blocked }) => (blocked ? 'Supporter bloqué du mur (une notification lui est envoyée)' : 'Supporter débloqué'),
  )

export const useSaveWallSettings = () =>
  useWallMutation(
    (wall: WallSettings) => api.put('/admin/wall/settings', wall),
    'Réglages du mur enregistrés',
  )

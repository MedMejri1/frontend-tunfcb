import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AppUser, Paginated, UserDetail } from '@/lib/types'

export interface UsersQuery {
  search?: string
  status?: string
  country?: string
  sort?: string
  page: number
  limit?: number
}

export const useUsers = (query: UsersQuery) =>
  useQuery({
    queryKey: ['users', query],
    queryFn: async () => (await api.get<Paginated<AppUser>>('/admin/users', { params: query })).data,
    placeholderData: keepPreviousData,
  })

export const useUserDetail = (id: string) =>
  useQuery({
    queryKey: ['user', id],
    queryFn: async () => (await api.get<UserDetail>(`/admin/users/${id}`)).data,
  })

/** Refresh every view that may show this user after a change. */
function useInvalidateUser(id: string) {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['user', id] }),
      qc.invalidateQueries({ queryKey: ['users'] }),
      qc.invalidateQueries({ queryKey: ['transactions'] }),
      qc.invalidateQueries({ queryKey: ['leaderboard'] }),
      qc.invalidateQueries({ queryKey: ['stats'] }),
    ])
}

export function useAdjustPoints(id: string) {
  const invalidate = useInvalidateUser(id)
  return useMutation({
    mutationFn: (body: { amount: number; reason: string }) => api.post(`/admin/users/${id}/points`, body),
    onSuccess: invalidate,
  })
}

export function useSetStatus(id: string) {
  const invalidate = useInvalidateUser(id)
  return useMutation({
    mutationFn: (body: { status: 'active' } | { status: 'banned'; reason: string }) =>
      api.post(`/admin/users/${id}/status`, body),
    onSuccess: invalidate,
  })
}

export function useUpdateUser(id: string) {
  const invalidate = useInvalidateUser(id)
  return useMutation({
    mutationFn: (body: Partial<Pick<AppUser, 'firstName' | 'lastName' | 'city' | 'country'>>) =>
      api.patch(`/admin/users/${id}`, body),
    onSuccess: invalidate,
  })
}

export const useResetPassword = (id: string) =>
  useMutation({ mutationFn: (password: string) => api.post(`/admin/users/${id}/password`, { password }) })

export function useDeleteUser(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete(`/admin/users/${id}`),
    onSuccess: () => qc.invalidateQueries(),
  })
}

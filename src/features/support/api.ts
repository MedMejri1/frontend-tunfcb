import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** Requests waiting for an answer (sidebar badge). */
export const useSupportSummary = () =>
  useQuery({
    queryKey: ['support', 'summary'],
    queryFn: async () => (await api.get<{ awaiting: number; unread: number }>('/admin/support/summary')).data,
    refetchInterval: 60_000,
  })

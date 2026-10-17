import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { TnGovernorate } from '@/lib/types'

/** Café requests waiting for a check (sidebar badge). */
export const useCafesSummary = () =>
  useQuery({
    queryKey: ['cafes', 'summary'],
    queryFn: async () => (await api.get<{ pending: number }>('/admin/cafes/summary')).data,
    refetchInterval: 60_000,
  })

/** Governorates → delegations (Tunisian municipality API, served by the backend). */
export const useTnLocations = () =>
  useQuery({
    queryKey: ['cafes', 'locations'],
    queryFn: async () => (await api.get<{ governorates: TnGovernorate[] }>('/cafes/locations')).data.governorates,
    staleTime: 24 * 60 * 60 * 1000,
  })

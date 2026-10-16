import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ShopSummary } from '@/lib/types'

/** Shop figures, also used by the sidebar badge (orders waiting for confirmation). */
export const useShopSummary = () =>
  useQuery({
    queryKey: ['shop', 'summary'],
    queryFn: async () => (await api.get<ShopSummary>('/admin/shop/summary')).data,
    refetchInterval: 60_000,
  })

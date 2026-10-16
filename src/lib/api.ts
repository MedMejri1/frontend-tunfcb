import axios, { AxiosError } from 'axios'

const TOKEN_KEY = 'barca-admin-token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

const API_URL: string = import.meta.env.VITE_API_URL ?? '/api'

export const api = axios.create({
  baseURL: API_URL,
  // Render's free plan sleeps: the first request can take ~50 s to wake it up.
  timeout: 60_000,
})

// Photos are stored as /api/uploads/…; in production the API lives on another domain.
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '')
export const assetUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${API_ORIGIN}${path}`)

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    // Expired or revoked session: back to the login page.
    if (error.response?.status === 401 && !error.config?.url?.includes('/admin/auth/login')) {
      tokenStore.clear()
      if (window.location.pathname !== '/login') window.location.assign('/login')
    }
    return Promise.reject(error)
  },
)

/** Readable message from an API error (backend sends { error, details }). */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { error?: string; details?: Record<string, string[]> } | undefined
    if (data?.details && typeof data.details === 'object') {
      const first = Object.entries(data.details).find(([, v]) => Array.isArray(v) && v.length)
      if (first) return `${data.error ?? 'Erreur'} : ${first[1][0]}`
    }
    if (data?.error) return data.error
    if (error.code === 'ECONNABORTED' || !error.response) return 'Serveur injoignable'
  }
  return 'Une erreur est survenue'
}

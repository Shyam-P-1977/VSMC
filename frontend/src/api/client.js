import axios from 'axios'

const TOKEN_KEY = 'vscms_token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

const client = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 30000 })

client.interceptors.request.use((config) => {
  const t = tokenStore.get()
  if (t) config.headers.Authorization = `Bearer ${t}`
  return config
})

client.interceptors.response.use(
  (r) => r,
  (error) => {
    const url = error.config?.url || ''
    // auto-logout when the session is no longer valid (but not for failed login attempts)
    if (error.response?.status === 401 && !url.includes('/auth/login') && tokenStore.get()) {
      tokenStore.clear()
      window.dispatchEvent(new CustomEvent('vscms:logout'))
    }
    return Promise.reject(error)
  },
)

export const apiError = (e) => {
  const d = e?.response?.data
  if (d?.error) return d.error
  if (e?.code === 'ECONNABORTED') return 'The request timed out. Please try again.'
  if (!e?.response) return 'Cannot reach the server. Check your connection.'
  return 'Something went wrong. Please try again.'
}

export const apiFieldErrors = (e) => {
  const d = e?.response?.data
  return d?.field ? { [d.field]: d.error } : {}
}

export default client

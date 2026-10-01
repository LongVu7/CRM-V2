import axios from 'axios'
import { parsePermission } from '@/services/ability'

// Root API instance for the application
const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Ensures cookies (like JWT) are sent with every request
  headers: {
    'Content-Type': 'application/json'
  }
})

const PERMISSION_REASONS = ['MISSING_PERMISSION', 'MISSING_LOOKUP_PERMISSION']

export function setupInterceptors(apiInstance, authStore, router, ability) {
  let refreshPromise = null

  // Add a request interceptor to attach the Authorization header if token exists
  apiInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  }, (error) => {
    return Promise.reject(error)
  })

  apiInstance.interceptors.response.use(
    response => response,
    async error => {
      const status = error.response?.status
      const reason = error.response?.data?.reason
      const requestUrl = error.config?.url || ''

      // Only handle 403 with permission-related reasons
      if (
        status === 403 &&
        PERMISSION_REASONS.includes(reason) &&
        !requestUrl.includes('/auth/me')
      ) {
        try {
          if (!refreshPromise) {
            refreshPromise = (async () => {
              await authStore.refreshPermissions()
              
              const currentRoute = router.currentRoute.value
              if (currentRoute.meta?.permission) {
                const { action, subject } = parsePermission(currentRoute.meta.permission)
                if (!ability.can(action, subject)) {
                  router.push('/forbidden')
                }
              }
            })().finally(() => {
              refreshPromise = null
            })
          }
          await refreshPromise
        } catch (refreshError) {
          // Fall through to reject original error
        }
      }

      return Promise.reject(error)
    }
  )
}

export default api

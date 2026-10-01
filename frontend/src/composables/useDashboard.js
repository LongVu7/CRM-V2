import { ref } from 'vue'
import * as api from '@/services/reportService'

export function useDashboard() {
  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const fetchDashboard = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      data.value = await api.getDashboard(filters)
    } catch (err) {
      error.value = err.response?.data?.error || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, fetchDashboard }
}

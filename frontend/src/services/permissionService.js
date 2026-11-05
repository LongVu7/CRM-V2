import api from '@/services/apiClient'

export const getAllPermissions = async () => {
  const response = await api.get('/roles/permissions')
  return response.data
}

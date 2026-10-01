import api from '@/services/apiClient'

const prefix = '/permissions'

export const getAllPermissions = async () => {
  const response = await api.get(`${prefix}/`)
  return response.data
}

import api from '@/services/apiClient'

const prefix = '/reports'

export const getDashboard = async (filters = {}) => {
  const params = {}
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  if (filters.oldProvinceIds?.length) params.oldProvinceIds = filters.oldProvinceIds.join(',')

  const response = await api.get(`${prefix}/dashboard`, { params })
  return response.data.data
}

import api from '@/services/apiClient'

const prefix = '/reports'

export const getDashboard = async (filters = {}) => {
  const params = {}
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  if (filters.sourceIds?.length) params.sourceIds = filters.sourceIds.join(',')
  if (filters.sourceDetailIds?.length) params.sourceDetailIds = filters.sourceDetailIds.join(',')
  if (filters.majorInterestTypes?.length) params.majorInterestTypes = filters.majorInterestTypes.join(',')
  if (filters.regionGroups?.length) params.regionGroups = filters.regionGroups.join(',')
  if (filters.oldProvinceIds?.length) params.oldProvinceIds = filters.oldProvinceIds.join(',')

  const response = await api.get(`${prefix}/dashboard`, { params })
  return response.data.data
}

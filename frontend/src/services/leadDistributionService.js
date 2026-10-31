import api from '@/services/apiClient'

const prefix = '/leads/distribution'

export const getUnassignedPool = async (params = {}) => {
  const response = await api.get(`${prefix}/pool`, { params })
  return response.data
}

export const getDistributionScopes = async () => {
  const response = await api.get(`${prefix}/scopes`)
  return response.data
}

export const getRecipients = async (params = {}) => {
  const response = await api.get(`${prefix}/recipients`, { params })
  return response.data
}

export const previewDistribution = async (payload) => {
  const response = await api.post(`${prefix}/preview`, payload)
  return response.data
}

export const executeDistribution = async (payload) => {
  const response = await api.post(`${prefix}/`, payload)
  return response.data
}

export default {
  getUnassignedPool,
  getDistributionScopes,
  getRecipients,
  previewDistribution,
  executeDistribution
}

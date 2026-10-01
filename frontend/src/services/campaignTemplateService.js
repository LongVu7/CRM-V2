import api from '@/services/apiClient'

const prefix = '/campaign-templates'

export const getAllTemplates = async (paramsObj = {}) => {
  const { page = 1, limit = 20, search = '', channel, status } = paramsObj
  const params = { page, limit, search }
  
  if (channel) params.channel = channel
  if (status) params.status = status

  const response = await api.get(`${prefix}/`, { params })
  return response.data
}

export const getTemplateById = async (id) => {
  const response = await api.get(`${prefix}/${id}`)
  return response.data
}

export const createTemplate = async (data) => {
  const response = await api.post(`${prefix}/`, data)
  return response.data
}

export const updateTemplate = async (id, data) => {
  const response = await api.patch(`${prefix}/${id}`, data)
  return response.data
}

export const deleteTemplate = async (id) => {
  const response = await api.delete(`${prefix}/${id}`)
  return response.data
}

export const getTemplateVariables = async () => {
  const response = await api.get(`${prefix}/variables`)
  return response.data
}

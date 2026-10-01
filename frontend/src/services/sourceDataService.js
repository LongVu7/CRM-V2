import api from '@/services/apiClient'

const prefix = '/source-data'

export const getRootOptions = async () => {
  const response = await api.get(`${prefix}/`)
  return response.data.data
}

export const getChildrenById = async (id) => {
  const response = await api.get(`${prefix}/${id}/children`)
  return response.data.data
}

export const getSourceDataById = async (id) => {
  const response = await api.get(`${prefix}/${id}`)
  return response.data.data
}

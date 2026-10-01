import api from '@/services/apiClient'

const prefix = '/major-data'

export const getRootMajors = async () => {
  const response = await api.get(`${prefix}/`)
  return response.data.data
}

export const getMajorChildrenById = async (id) => {
  const response = await api.get(`${prefix}/${id}/children`)
  return response.data.data
}

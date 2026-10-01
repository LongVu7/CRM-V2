import api from '@/services/apiClient'

const prefix = '/auth'

export const login = async (email, password) => {
  const response = await api.post(`${prefix}/login`, { email, password })
  return response.data
}

export const logout = async () => {
  const response = await api.post(`${prefix}/logout`)
  return response.data
}

export const getMe = async () => {
  const response = await api.get(`${prefix}/me`)
  return response.data
}

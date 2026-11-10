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

export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.put(`${prefix}/change-password`, { currentPassword, newPassword })
  return response.data
}

export const updateProfile = async (data) => {
  const response = await api.put(`${prefix}/profile`, data)
  return response.data
}

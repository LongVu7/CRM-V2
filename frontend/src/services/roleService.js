import api from '@/services/apiClient'

const prefix = '/roles'

export const getAllRoles = async () => {
  const response = await api.get(`${prefix}/`)
  return response.data.roles
}

export const getRoleById = async (id) => {
  const response = await api.get(`${prefix}/${id}`)
  return response.data.data
}

export const createRole = async (data) => {
  const response = await api.post(`${prefix}/`, data)
  return response.data
}

export const updateRole = async (id, data) => {
  const response = await api.put(`${prefix}/${id}`, data)
  return response.data
}

export const deleteRole = async (id) => {
  const response = await api.delete(`${prefix}/${id}`)
  return response.data
}

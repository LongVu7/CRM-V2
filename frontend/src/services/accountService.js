import api from '@/services/apiClient'

const accountPrefix = '/accounts'

export const getAllAccounts = async () => {
  const response = await api.get(`${accountPrefix}/`)
  return response.data.accounts
}

export const getAccountById = async (id) => {
  const response = await api.get(`${accountPrefix}/${id}`)
  return response.data.accounts
}

export const createAccount = async (data) => {
  const response = await api.post(`${accountPrefix}/`, data)
  return response.data
}

export const updateAccount = async (id, data) => {
  const response = await api.put(`${accountPrefix}/${id}`, data)
  return response.data
}

export const deleteAccount = async (id) => {
  const response = await api.delete(`${accountPrefix}/${id}`)
  return response.data
}

export const getAllRoles = async () => {
  const response = await api.get('/roles/')
  return response.data.roles
}

export const getAllGroups = async () => {
  const response = await api.get('/groups/')
  return response.data.groups
}

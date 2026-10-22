import api from '@/services/apiClient'

const prefix = '/teams'

export const getAllTeams = async (params = {}) => {
  const response = await api.get(`${prefix}/`, { params })
  return response.data.data || []
}

export const getTeamById = async (id) => {
  const response = await api.get(`${prefix}/${id}`)
  return response.data.data
}

export const createTeam = async (teamData) => {
  const response = await api.post(`${prefix}/`, teamData)
  return response.data
}

export const updateTeam = async (id, teamData) => {
  const response = await api.put(`${prefix}/${id}`, teamData)
  return response.data
}

export const deleteTeam = async (id) => {
  const response = await api.delete(`${prefix}/${id}`)
  return response.data
}

export const addMemberToTeam = async (teamId, accountId) => {
  const response = await api.post(`${prefix}/${teamId}/members`, { accountId })
  return response.data
}

export const removeMemberFromTeam = async (teamId, accountId) => {
  const response = await api.delete(`${prefix}/${teamId}/members/${accountId}`)
  return response.data
}

export const updateTeamPermissions = async (teamId, permissions) => {
  const response = await api.put(`${prefix}/${teamId}/permissions`, { permissions })
  return response.data
}

export const getAvailableAccounts = async () => {
  const response = await api.get(`${prefix}/available-accounts`)
  return response.data.data || []
}

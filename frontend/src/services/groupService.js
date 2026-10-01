import api from '@/services/apiClient'

const prefix = '/groups'

export const getAllGroups = async () => {
  const response = await api.get(`${prefix}/`)
  return response.data.groups
}

export const getGroupById = async (id) => {
  const response = await api.get(`${prefix}/${id}`)
  return response.data.data
}

export const createGroup = async (groupData) => {
  const response = await api.post(`${prefix}/`, groupData)
  return response.data
}

export const updateGroup = async (id, groupData) => {
  const response = await api.put(`${prefix}/${id}`, groupData)
  return response.data
}

export const deleteGroup = async (id) => {
  const response = await api.delete(`${prefix}/${id}`)
  return response.data
}

export const addMemberToGroup = async (groupId, accountId) => {
  const response = await api.put(`${prefix}/${groupId}/add-member`, { accountId })
  return response.data
}

export const removeMemberFromGroup = async (groupId, accountId) => {
  const response = await api.put(`${prefix}/${groupId}/remove-member`, { accountId })
  return response.data
}

import api from '@/services/apiClient'

const prefix = '/campaigns'

// ─── Campaign CRUD ───
export const getAllCampaigns = async () => {
  const response = await api.get(`${prefix}/`)
  return response.data
}

export const getCampaignById = async (id) => {
  const response = await api.get(`${prefix}/${id}`)
  return response.data
}

export const createCampaign = async (data) => {
  const response = await api.post(`${prefix}/`, data)
  return response.data
}

export const updateCampaign = async (id, data) => {
  const response = await api.put(`${prefix}/${id}`, data)
  return response.data
}

export const deleteCampaign = async (id) => {
  const response = await api.delete(`${prefix}/${id}`)
  return response.data
}

// ─── Activity CRUD ───
export const createActivity = async (campaignId, data) => {
  const response = await api.post(`${prefix}/${campaignId}/activities`, data)
  return response.data
}

export const updateActivity = async (campaignId, activityId, data) => {
  const response = await api.put(`${prefix}/${campaignId}/activities/${activityId}`, data)
  return response.data
}

export const deleteActivity = async (campaignId, activityId) => {
  const response = await api.delete(`${prefix}/${campaignId}/activities/${activityId}`)
  return response.data
}

// ─── Activity Recipients ───
export const addActivityRecipients = async (campaignId, activityId, inquiryIds) => {
  const response = await api.post(`${prefix}/${campaignId}/activities/${activityId}/recipients`, { inquiryIds })
  return response.data
}

// ─── Send Activity ───
export const sendActivity = async (campaignId, activityId) => {
  const response = await api.post(`${prefix}/${campaignId}/activities/${activityId}/send`)
  return response.data
}

// ─── Templates ───
export const createTemplate = async (data) => {
  const response = await api.post(`${prefix}/templates/`, data)
  return response.data
}

export const listTemplates = async () => {
  const response = await api.get(`${prefix}/templates/`)
  return response.data
}

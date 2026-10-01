import { ref } from 'vue'
import * as api from '@/services/campaignService'

export function useCampaigns() {
  const campaigns = ref([])
  const currentCampaign = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const fetchCampaigns = async () => {
    loading.value = true
    error.value = null
    try {
      campaigns.value = await api.getAllCampaigns()
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to fetch campaigns'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchCampaignById = async (id) => {
    loading.value = true
    error.value = null
    try {
      const data = await api.getCampaignById(id)
      currentCampaign.value = data
      return data
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to fetch campaign'
      throw err
    } finally {
      loading.value = false
    }
  }

  const createCampaign = async (payload) => {
    loading.value = true
    error.value = null
    try {
      return await api.createCampaign(payload)
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to create campaign'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateCampaign = async (id, payload) => {
    loading.value = true
    error.value = null
    try {
      return await api.updateCampaign(id, payload)
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to update campaign'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteCampaign = async (id) => {
    loading.value = true
    error.value = null
    try {
      await api.deleteCampaign(id)
      campaigns.value = campaigns.value.filter(c => c.id !== id)
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to delete campaign'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ─── Activity ───

  const createActivity = async (campaignId, payload) => {
    loading.value = true
    error.value = null
    try {
      return await api.createActivity(campaignId, payload)
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to create activity'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateActivity = async (campaignId, activityId, payload) => {
    loading.value = true
    error.value = null
    try {
      return await api.updateActivity(campaignId, activityId, payload)
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to update activity'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteActivity = async (campaignId, activityId) => {
    loading.value = true
    error.value = null
    try {
      await api.deleteActivity(campaignId, activityId)
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to delete activity'
      throw err
    } finally {
      loading.value = false
    }
  }

  const addActivityRecipients = async (campaignId, activityId, inquiryIds) => {
    loading.value = true
    error.value = null
    try {
      return await api.addActivityRecipients(campaignId, activityId, inquiryIds)
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to add recipients'
      throw err
    } finally {
      loading.value = false
    }
  }

  const sendActivity = async (campaignId, activityId) => {
    loading.value = true
    error.value = null
    try {
      return await api.sendActivity(campaignId, activityId)
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to send activity'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    campaigns,
    currentCampaign,
    loading,
    error,
    fetchCampaigns,
    fetchCampaignById,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    createActivity,
    updateActivity,
    deleteActivity,
    addActivityRecipients,
    sendActivity
  }
}

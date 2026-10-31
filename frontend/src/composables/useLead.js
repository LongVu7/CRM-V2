import { ref } from 'vue'
import * as api from '@/services/leadService'

export function useLead() {
  const leads = ref([])
  const lead = ref(null)
  const pagination = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const fetchLeads = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.getAllLeads(params)
      leads.value = response.data
      pagination.value = response.pagination
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchLeadById = async (id) => {
    loading.value = true
    error.value = null
    try {
      lead.value = await api.getLeadById(id)
      return lead.value
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createLead = async (payload) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.createLead(payload)
      return response
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateLead = async (id, payload) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.updateLead(id, payload)
      return response
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const unassignStudent = async (leadId, studentId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.unassignStudent(leadId, studentId)
      return response
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const assignStudent = async (leadId, studentId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.assignStudent(leadId, studentId)
      return response
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteLead = async (id) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.deleteLead(id)
      return response
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteLeads = async (ids) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.deleteLeads(ids)
      return response
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchLeadStatusHistory = async (id) => {
    loading.value = true
    error.value = null
    try {
      return await api.getLeadStatusHistory(id)
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    leads,
    lead,
    pagination,
    loading,
    error,
    fetchLeads,
    fetchLeadById,
    fetchLeadStatusHistory,
    createLead,
    updateLead,
    deleteLead,
    deleteLeads,
    assignStudent,
    unassignStudent
  }
}

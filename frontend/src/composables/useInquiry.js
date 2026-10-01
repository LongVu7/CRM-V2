import { ref } from 'vue'
import * as api from '@/services/inquiryService'

export function useInquiry() {
  const inquiries = ref([])
  const inquiry = ref(null)
  const pagination = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const fetchInquiries = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.getAllInquiries(params)
      inquiries.value = response.data
      pagination.value = response.pagination
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchInquiryById = async (id) => {
    loading.value = true
    error.value = null
    try {
      inquiry.value = await api.getInquiryById(id)
      return inquiry.value
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createInquiry = async (payload) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.createInquiry(payload)
      return response
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateInquiry = async (id, payload) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.updateInquiry(id, payload)
      return response
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const unassignStudent = async (inquiryId, studentId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.unassignStudent(inquiryId, studentId)
      return response
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const assignStudent = async (inquiryId, studentId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.assignStudent(inquiryId, studentId)
      return response
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteInquiry = async (id) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.deleteInquiry(id)
      return response
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    inquiries,
    inquiry,
    pagination,
    loading,
    error,
    fetchInquiries,
    fetchInquiryById,
    createInquiry,
    updateInquiry,
    deleteInquiry,
    assignStudent,
    unassignStudent
  }
}

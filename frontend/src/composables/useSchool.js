import { ref } from 'vue'
import * as api from '@/services/schoolService'

export function useSchool() {
  const schools = ref([])
  const pagination = ref(null)
  const school = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const fetchSchools = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.getAllSchools(params)
      schools.value = response.data
      pagination.value = response.pagination
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchSchoolById = async (id) => {
    loading.value = true
    error.value = null
    try {
      school.value = await api.getSchoolById(id)
      return school.value
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createSchool = async (payload) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.createSchool(payload)
      return response
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateSchool = async (id, payload) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.updateSchool(id, payload)
      return response
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteSchool = async (id) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.deleteSchool(id)
      return response
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    schools,
    pagination,
    school,
    loading,
    error,
    fetchSchools,
    fetchSchoolById,
    createSchool,
    updateSchool,
    deleteSchool
  }
}

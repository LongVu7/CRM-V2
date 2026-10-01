import { ref } from 'vue'
import * as api from '@/services/studentService'

export function useStudent() {
  const students = ref([])
  const pagination = ref(null)
  const student = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const fetchStudents = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.getAllStudents(params)
      students.value = response.data
      pagination.value = response.pagination
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchStudentById = async (id) => {
    loading.value = true
    error.value = null
    try {
      student.value = await api.getStudentById(id)
      return student.value
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createStudent = async (payload) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.createStudent(payload)
      // console.log('response: ', response)
      return response
    } catch (err) {
      console.log(err.response?.data)
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateStudent = async (id, payload) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.updateStudent(id, payload)
      return response
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteStudent = async (id) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.deleteStudent(id)
      return response
    } catch (err) {
      error.value = err.response?.data?.error || err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    students,
    pagination,
    student,
    loading,
    error,
    fetchStudents,
    fetchStudentById,
    createStudent,
    updateStudent,
    deleteStudent
  }
}

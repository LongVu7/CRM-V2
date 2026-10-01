import api from '@/services/apiClient'

const prefix = '/students'

export const getAllStudents = async (paramsObj = {}) => {
  const { page = 1, limit = 20, search = '', sortField, sortOrder, oldProvinceId, birthYear } = paramsObj
  const params = { page, limit, search }
  if (sortField) {
    params.sortField = sortField
    params.sortOrder = sortOrder
  }
  if (oldProvinceId) {
    params.oldProvinceId = oldProvinceId
  }
  if (birthYear) {
    params.birthYear = birthYear
  }
  const response = await api.get(`${prefix}/`, { params })
  return response.data
}

export const getStudentById = async (id) => {
  const response = await api.get(`${prefix}/${id}`)
  return response.data.data
}

export const createStudent = async (studentData) => {
  const response = await api.post(`${prefix}/`, studentData)
  return response.data
}

export const updateStudent = async (id, studentData) => {
  const response = await api.put(`${prefix}/${id}`, studentData)
  return response.data
}

export const deleteStudent = async (id) => {
  const response = await api.delete(`${prefix}/${id}`)
  return response.data
}

export const previewImport = async (files) => {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })

  const response = await api.post(`${prefix}/import/preview`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

export const confirmImport = async (students) => {
  const response = await api.post(`${prefix}/import/confirm`, { students })
  return response.data
}

export const exportStudents = async (paramsObj = {}) => {
  const response = await api.get(`${prefix}/export`, {
    params: paramsObj,
    responseType: 'blob'
  })
  return response.data
}

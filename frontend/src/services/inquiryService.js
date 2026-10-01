import api from '@/services/apiClient'

const prefix = '/inquiries'

export const getAllInquiries = async ({ page = 1, limit = 20, search = '', hasStudent } = {}) => {
  const params = { page, limit, search }
  if (hasStudent !== undefined) params.hasStudent = hasStudent
  const response = await api.get(`${prefix}/`, { params })
  return response.data
}

export const getInquiryById = async (id) => {
  const response = await api.get(`${prefix}/${id}`)
  return response.data.data
}

export const createInquiry = async (data) => {
  const response = await api.post(`${prefix}/`, data)
  return response.data
}

export const updateInquiry = async (id, data) => {
  const response = await api.put(`${prefix}/${id}`, data)
  return response.data
}

export const deleteInquiry = async (id) => {
  const response = await api.delete(`${prefix}/${id}`)
  return response.data
}


export const unassignStudent = async (inquiryId, studentId) => {
  const response = await api.delete(`${prefix}/${inquiryId}/assign-student`, { data: { studentId } })
  return response.data
}

export const assignStudent = async (inquiryId, studentId) => {
  const response = await api.put(`${prefix}/${inquiryId}/assign-student`, { studentId })
  return response.data
}

export const searchAccounts = async (query) => {
  const response = await api.get(`${prefix}/search/accounts`, { params: { q: query } })
  return response.data.results
}

export const searchStudents = async (query) => {
  const response = await api.get(`${prefix}/search/students`, { params: { q: query } })
  return response.data.results
}

export const downloadInquiryTemplate = async () => {
  const response = await api.get(`${prefix}/import/template`, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'inquiry_import_template.xlsx')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export const previewImportInquiry = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post(`${prefix}/import/preview`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}

export const confirmImportInquiry = async (importToken) => {
  const response = await api.post(`${prefix}/import/confirm`, { importToken })
  return response.data
}

export const exportInquiries = async (paramsObj = {}) => {
  const response = await api.get(`${prefix}/export`, {
    params: paramsObj,
    responseType: 'blob'
  })
  return response.data
}
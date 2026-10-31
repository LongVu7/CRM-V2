import api from '@/services/apiClient'

const prefix = '/leads'

export const getAllLeads = async (params = {}) => {
  const response = await api.get(`${prefix}/`, { params })
  return response.data
}

export const getLeadById = async (id) => {
  const response = await api.get(`${prefix}/${id}`)
  return response.data.data
}

export const getLeadStatusHistory = async (id) => {
  const response = await api.get(`${prefix}/${id}/status-history`)
  return response.data
}

export const createLead = async (data) => {
  const response = await api.post(`${prefix}/`, data)
  return response.data
}

export const updateLead = async (id, data) => {
  const response = await api.put(`${prefix}/${id}`, data)
  return response.data
}

export const deleteLead = async (id) => {
  const response = await api.delete(`${prefix}/${id}`)
  return response.data
}

export const deleteLeads = async (ids = []) => {
  return Promise.all(ids.map(id => api.delete(`${prefix}/${id}`)))
}


export const unassignStudent = async (leadId, studentId) => {
  const response = await api.delete(`${prefix}/${leadId}/assign-student`, { data: { studentId } })
  return response.data
}

export const assignStudent = async (leadId, studentId) => {
  const response = await api.put(`${prefix}/${leadId}/assign-student`, { studentId })
  return response.data
}

export const searchAccounts = async (query = '') => {
  const params = query ? { q: query } : {}
  const response = await api.get(`${prefix}/search/accounts`, { params })
  return response.data.results
}

export const searchStudents = async (query = '') => {
  const params = query ? { q: query } : {}
  const response = await api.get(`${prefix}/search/students`, { params })
  return response.data.results
}

export const downloadLeadTemplate = async () => {
  const response = await api.get(`${prefix}/import/template`, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'lead_import_template.xlsx')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export const previewImportLead = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post(`${prefix}/import/preview`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}

export const confirmImportLead = async (importToken) => {
  const response = await api.post(`${prefix}/import/confirm`, { importToken })
  return response.data
}

export const exportLeads = async (paramsObj = {}) => {
  const response = await api.get(`${prefix}/export`, {
    params: paramsObj,
    responseType: 'blob'
  })
  return response.data
}

export const getLeadOptions = async () => {
  const response = await api.get(`${prefix}/options`)
  return response.data.data
}

export const syncGoogleSheets = async (params = {}) => {
  const response = await api.post(`${prefix}/import/sheet-sync`, {}, { params })
  return response.data
}
import api from '@/services/apiClient'

const prefix = '/schools'

export const getAllOldProvinces = async () => {
  const response = await api.get('/old-provinces/')
  return response.data.data
}

export const getAllNewProvinces = async () => {
  const response = await api.get('/new-provinces/')
  return response.data.data
}

export const getAllCountries = async () => {
  const response = await api.get('/countries/')
  return response.data.data
}

export const getSchoolOptions = async (oldProvinceId) => {
  const params = {}
  if (oldProvinceId) params.oldProvinceId = oldProvinceId
  const response = await api.get(`${prefix}/options`, { params })
  return response.data.data
}

export const getAllSchools = async ({ page = 1, limit = 20, search = '', oldProvinceId } = {}) => {
  const params = { page, limit }
  if (search) params.search = search
  if (oldProvinceId) params.oldProvinceId = oldProvinceId
  const response = await api.get(`${prefix}/`, { params })
  return response.data
}

export const getSchoolById = async (id) => {
  const response = await api.get(`${prefix}/${id}`)
  return response.data.data
}

export const createSchool = async (data) => {
  const response = await api.post(`${prefix}/`, data)
  return response.data
}

export const updateSchool = async (id, data) => {
  const response = await api.put(`${prefix}/${id}`, data)
  return response.data
}

export const deleteSchool = async (id) => {
  const response = await api.delete(`${prefix}/${id}`)
  return response.data
}

export const getSchoolStatistics = async () => {
  const response = await api.get(`${prefix}/statistics`)
  return response.data.data
}

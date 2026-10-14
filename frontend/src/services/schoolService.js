import api from '@/services/apiClient'
import { getStudentOptions } from '@/services/studentService'

const prefix = '/schools'

export const getSchoolOptions = async (oldProvinceId) => {
  const params = {}
  if (oldProvinceId) params.oldProvinceId = oldProvinceId
  const response = await api.get(`${prefix}/options`, { params })
  return response.data.data
}

export const getAllOldProvinces = async () => {
  const data = await getSchoolOptions()
  return data.oldProvinces || []
}

export const getAllNewProvinces = async () => {
  const data = await getStudentOptions()
  return data.newProvinces || []
}

export const getAllCountries = async () => {
  const response = await api.get('/countries/')
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

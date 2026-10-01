import { ref } from 'vue'
import * as roleApi from '@/services/roleService'
import { getAllPermissions } from '@/services/permissionService'

export function useRole() {
  const roles = ref([])
  const role = ref(null)
  const permissions = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchRoles = async () => {
    loading.value = true
    error.value = null
    try {
      roles.value = await roleApi.getAllRoles()
      return roles.value
    } catch (err) {
      error.value = err.response?.data?.error || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchRoleById = async (id) => {
    loading.value = true
    error.value = null
    try {
      role.value = await roleApi.getRoleById(id)
      return role.value
    } catch (err) {
      error.value = err.response?.data?.error || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createRole = async (payload) => {
    loading.value = true
    error.value = null
    try {
      return await roleApi.createRole(payload)
    } catch (err) {
      error.value = err.response?.data?.error || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateRole = async (id, payload) => {
    loading.value = true
    error.value = null
    try {
      return await roleApi.updateRole(id, payload)
    } catch (err) {
      error.value = err.response?.data?.error || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteRole = async (id) => {
    loading.value = true
    error.value = null
    try {
      return await roleApi.deleteRole(id)
    } catch (err) {
      error.value = err.response?.data?.error || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchPermissions = async () => {
    try {
      const data = await getAllPermissions()
      permissions.value = data.permissions || []
      return permissions.value
    } catch (err) {
      permissions.value = []
      throw err
    }
  }

  return {
    roles,
    role,
    permissions,
    loading,
    error,
    fetchRoles,
    fetchRoleById,
    createRole,
    updateRole,
    deleteRole,
    fetchPermissions
  }
}

import { ref } from 'vue'
import * as api from '@/services/groupService'

export function useGroup() {
  const groups = ref([])
  const group = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const fetchGroups = async () => {
    loading.value = true
    error.value = null
    try {
      groups.value = await api.getAllGroups()
      return groups.value
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchGroupById = async (id) => {
    loading.value = true
    error.value = null
    try {
      group.value = await api.getGroupById(id)
      return group.value
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createGroup = async (payload) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.createGroup(payload)
      return response
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateGroup = async (id, payload) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.updateGroup(id, payload)
      return response
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteGroup = async (id) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.deleteGroup(id)
      return response
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const addMember = async (groupId, accountId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.addMemberToGroup(groupId, accountId)
      return response
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const removeMember = async (groupId, accountId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.removeMemberFromGroup(groupId, accountId)
      return response
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    groups,
    group,
    loading,
    error,
    fetchGroups,
    fetchGroupById,
    createGroup,
    updateGroup,
    deleteGroup,
    addMember,
    removeMember
  }
}

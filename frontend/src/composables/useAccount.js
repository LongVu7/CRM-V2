import { ref } from 'vue'
import * as api from '@/services/accountService'

export function useAccount() {
  const accounts = ref([])
  const account = ref(null)
  const roles = ref([])
  const groups = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchAccounts = async () => {
    loading.value = true
    error.value = null
    try {
      accounts.value = await api.getAllAccounts()
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchAccountById = async (id) => {
    loading.value = true
    error.value = null
    try {
      account.value = await api.getAccountById(id)
      return account.value
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createAccount = async (payload) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.createAccount(payload)
      return response
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateAccount = async (id, payload) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.updateAccount(id, payload)
      return response
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteAccount = async (id) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.deleteAccount(id)
      return response
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchRoles = async () => {
    try {
      roles.value = await api.getAllRoles()
    } catch (err) {
      roles.value = []
    }
  }

  const fetchGroups = async () => {
    try {
      groups.value = await api.getAllGroups()
    } catch (err) {
      groups.value = []
    }
  }

  return {
    accounts,
    account,
    roles,
    groups,
    loading,
    error,
    fetchAccounts,
    fetchAccountById,
    createAccount,
    updateAccount,
    deleteAccount,
    fetchRoles,
    fetchGroups
  }
}

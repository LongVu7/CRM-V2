import { ref } from 'vue'
import * as api from '@/services/accountService'

export function useAccount() {
  const accounts = ref([])
  const account = ref(null)
  const roles = ref([])
  const teams = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchAccounts = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await api.getAllAccounts()
      accounts.value = (data || []).map(acc => ({
        ...acc,
        teamId: acc.teamId ?? acc.teamMemberships?.[0]?.team?.id ?? acc.groupId ?? null,
        team: acc.team || acc.teamMemberships?.[0]?.team || acc.group || null
      }))
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
      const data = await api.getAccountById(id)
      account.value = data ? {
        ...data,
        teamId: data.teamId ?? data.teamMemberships?.[0]?.team?.id ?? data.groupId ?? null,
        team: data.team || data.teamMemberships?.[0]?.team || data.group || null
      } : null
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
    } catch {
      roles.value = []
    }
  }

  const fetchTeams = async () => {
    try {
      teams.value = await api.getAllTeams()
    } catch {
      teams.value = []
    }
  }

  return {
    accounts,
    account,
    roles,
    teams,
    loading,
    error,
    fetchAccounts,
    fetchAccountById,
    createAccount,
    updateAccount,
    deleteAccount,
    fetchRoles,
    fetchTeams
  }
}

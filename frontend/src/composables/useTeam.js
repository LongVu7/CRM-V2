import { ref } from 'vue'
import * as api from '@/services/teamService'

export function useTeam() {
  const teams = ref([])
  const teamTree = ref([])
  const team = ref(null)
  const parentOptions = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchTeams = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      teams.value = await api.getAllTeams(params)
      return teams.value
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchTeamTree = async () => {
    loading.value = true
    error.value = null
    try {
      teamTree.value = await api.getTeamTree()
      return teamTree.value
    } catch (err) {
      teamTree.value = []
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchParentOptions = async (excludeTeamId = null) => {
    loading.value = true
    error.value = null
    try {
      parentOptions.value = await api.getParentTeamOptions(excludeTeamId)
      return parentOptions.value
    } catch (err) {
      parentOptions.value = []
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchTeamById = async (id) => {
    loading.value = true
    error.value = null
    try {
      team.value = await api.getTeamById(id)
      return team.value
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createTeam = async (payload) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.createTeam(payload)
      return response
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateTeam = async (id, payload) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.updateTeam(id, payload)
      return response
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteTeam = async (id) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.deleteTeam(id)
      return response
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const addMember = async (teamId, accountId, roleId = null) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.addMemberToTeam(teamId, accountId, roleId)
      return response
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const removeMember = async (teamId, accountId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.removeMemberFromTeam(teamId, accountId)
      return response
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const availableAccounts = ref([])
  const fetchAvailableAccounts = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await api.getAvailableAccounts()
      availableAccounts.value = data || []
      return availableAccounts.value
    } catch (err) {
      availableAccounts.value = []
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    teams,
    teamTree,
    team,
    loading,
    error,
    availableAccounts,
    parentOptions,
    fetchTeams,
    fetchTeamTree,
    fetchTeamById,
    fetchParentOptions,
    createTeam,
    updateTeam,
    deleteTeam,
    addMember,
    removeMember,
    fetchAvailableAccounts
  }
}

import { ref } from 'vue'
import * as api from '@/services/teamService'

export function useTeam() {
  const teams = ref([])
  const team = ref(null)
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

  const addMember = async (teamId, accountId) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.addMemberToTeam(teamId, accountId)
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

  const updatePermissions = async (teamId, permissions) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.updateTeamPermissions(teamId, permissions)
      return response
    } catch (err) {
      error.value = err.response?.data?.details || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    teams,
    team,
    loading,
    error,
    fetchTeams,
    fetchTeamById,
    createTeam,
    updateTeam,
    deleteTeam,
    addMember,
    removeMember,
    updatePermissions
  }
}

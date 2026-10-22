import { defineStore } from 'pinia'
import { login as apiLogin, logout as apiLogout, getMe as apiGetMe } from '@/services/authService'
import { ability, buildAbilityRules, permissionsToCaslRules } from '@/services/ability'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loading: false,
    initialized: false
  }),
  getters: {
    isLoggedIn: (state) => !!state.user
  },
  actions: {
    updateAbility(userData = null) {
      if (!userData) {
        ability.update([])
        return
      }
      if (typeof userData === 'object' && !Array.isArray(userData)) {
        ability.update(buildAbilityRules(userData))
      } else if (Array.isArray(userData)) {
        ability.update(permissionsToCaslRules(userData))
      }
    },
    async login(email, password) {
      this.loading = true
      try {
        const data = await apiLogin(email, password)
        this.user = data.user
        this.updateAbility(data.user)
        return data
      } finally {
        this.loading = false
      }
    },
    async logout() {
      try {
        await apiLogout()
      } finally {
        this.user = null
        this.updateAbility(null)
        localStorage.removeItem('token')
      }
    },
    async checkAuth() {
      this.loading = true
      try {
        const data = await apiGetMe()
        this.user = data.user
        this.updateAbility(data.user)
      } catch (error) {
        this.user = null
        this.updateAbility(null)
      } finally {
        this.loading = false
        this.initialized = true
      }
    },
    async refreshPermissions() {
      const data = await apiGetMe()
      this.user = data.user
      this.updateAbility(data.user)
    }
  }
})

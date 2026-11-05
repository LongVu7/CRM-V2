import { defineStore } from 'pinia'
import { login as apiLogin, logout as apiLogout, getMe as apiGetMe } from '@/services/authService'
import { ability } from '@/services/ability'

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
      if (Array.isArray(userData.abilityRules)) {
        ability.update(userData.abilityRules)
      } else if (Array.isArray(userData)) {
        ability.update(userData)
      } else {
        ability.update([])
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
      } catch {
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

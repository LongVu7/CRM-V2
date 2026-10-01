import { defineStore } from 'pinia'
import { login as apiLogin, logout as apiLogout, getMe as apiGetMe } from '@/services/authService'
import { ability, permissionsToCaslRules } from '@/services/ability'

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
    updateAbility(permissions = []) {
      ability.update(permissionsToCaslRules(permissions))
    },
    async login(email, password) {
      this.loading = true
      try {
        const data = await apiLogin(email, password)
        this.user = data.user
        this.updateAbility(data.user.permissions || [])
        if (data.token) {
          localStorage.setItem('token', data.token)
        }
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
        this.updateAbility([])
        localStorage.removeItem('token')
      }
    },
    async checkAuth() {
      this.loading = true
      try {
        const data = await apiGetMe()
        this.user = data.user
        this.updateAbility(data.user.permissions || [])
      } catch (error) {
        this.user = null
        this.updateAbility([])
      } finally {
        this.loading = false
        this.initialized = true
      }
    },
    async refreshPermissions() {
      const data = await apiGetMe()
      this.user = data.user
      this.updateAbility(data.user.permissions || [])
    }
  }
})

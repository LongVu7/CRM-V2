<template>
  <div class="login-wrapper">
    <div class="login-card">
      <div class="login-header">
        <i class="pi pi-building brand-icon"></i>
        <h1>Admissions CRM</h1>
        <p>Sign in to your account</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-field">
          <label for="email">Email</label>
          <InputText 
            id="email" 
            v-model="email" 
            type="email" 
            placeholder="admin@example.com" 
            required 
            fluid 
          />
        </div>

        <div class="form-field">
          <label for="password">Password</label>
          <Password 
            id="password" 
            v-model="password" 
            :feedback="false"
            toggleMask
            placeholder="Enter password"
            required 
            fluid 
          />
        </div>

        <Button 
          type="submit" 
          label="Sign In" 
          icon="pi pi-sign-in" 
          :loading="authStore.loading" 
          class="submit-btn" 
        />
      </form>
    </div>
  </div>
</template>

<script>
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'LoginView',
  components: { InputText, Password, Button },
  setup() {
    const toast = useToast()
    const authStore = useAuthStore()
    return { toast, authStore }
  },
  data() {
    return {
      email: '',
      password: ''
    }
  },
  methods: {
    async handleLogin() {
      try {
        await this.authStore.login(this.email, this.password)
        this.toast.add({ severity: 'success', summary: 'Welcome', detail: 'Successfully logged in', life: 3000 })
        this.$router.push('/')
      } catch (error) {
        this.toast.add({ 
          severity: 'error', 
          summary: 'Login Failed', 
          detail: error.response?.data?.error || error.message || 'Invalid credentials', 
          life: 5000 
        })
      }
    }
  }
}
</script>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--p-surface-50);
  width: 100%;
}

.login-card {
  background: var(--p-surface-0);
  padding: 3rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 420px;
}

.login-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.brand-icon {
  font-size: 3rem;
  color: var(--p-primary-color);
  margin-bottom: 1rem;
}

.login-header h1 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.login-header p {
  margin: 0.5rem 0 0;
  color: var(--p-text-muted-color);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-weight: 600;
  color: var(--p-text-color);
  font-size: 0.9rem;
}

.submit-btn {
  margin-top: 1rem;
  width: 100%;
}
</style>

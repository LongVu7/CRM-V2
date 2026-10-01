import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// PrimeVue
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'

const CustomPreset = definePreset(Aura, {
  semantic: {
    primary: { //Primary color: #3b65b5
      50: '#eff4fa',
      100: '#dce8f5',
      200: '#bed5ee',
      300: '#90bae4',
      400: '#5c9ad5',
      500: '#3b65b5', 
      600: '#2b509a',
      700: '#23417e',
      800: '#1f3768',
      900: '#1d2f56',
      950: '#131e39'
    }
  }
})
import 'primeflex/primeflex.css'
import 'primeicons/primeicons.css'

// PrimeVue Services
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'

// Create Vue app instance
const app = createApp(App)

const pinia = createPinia()
app.use(pinia)

import { abilitiesPlugin } from '@casl/vue'
import { ability } from '@/services/ability'
import api, { setupInterceptors } from '@/services/apiClient'

app.use(abilitiesPlugin, ability, { useGlobalProperties: true })

import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore(pinia)

// Setup Axios interceptors with dependencies injected
setupInterceptors(api, authStore, router, ability)

// Check auth state before mounting app and router
authStore.checkAuth().finally(() => {
  app.use(router)

  app.use(PrimeVue, {
    theme: {
      preset: CustomPreset
    }
  })

  // Register PrimeVue services
  app.use(ToastService)
  app.use(ConfirmationService)

  // Register directives
  app.directive('tooltip', Tooltip)

  app.mount('#app')
})

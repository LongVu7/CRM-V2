<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center p-8 bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg shadow-sm">
      <i class="pi pi-lock text-red-500 mb-4" style="font-size: 3rem"></i>
      <h1 class="text-2xl font-bold mb-2">Access Denied</h1>
      <p class="text-surface-600 dark:text-surface-400 mb-6">
        You do not have the required permissions to view this page.
      </p>
      <Button label="Return Home" icon="pi pi-home" @click="goHome" class="w-full" />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import Button from 'primevue/button'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

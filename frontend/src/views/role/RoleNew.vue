<template>
  <div class="role-new-view">
    <div class="page-header">
      <h1>Create New Role</h1>
      <Button label="Back to Roles" severity="secondary" icon="pi pi-arrow-left" @click="$router.push('/roles')" />
    </div>

    <div class="section-card">
      <div class="card-header">
        <h2><i class="pi pi-shield"></i> Role Details</h2>
      </div>
      <RoleForm @submit="handleSubmit" :isSubmitting="isSubmitting" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useRole } from '@/composables/useRole'
import RoleForm from '@/components/role/RoleForm.vue'

const router = useRouter()
const toast = useToast()
const { createRole } = useRole()

const isSubmitting = ref(false)

const handleSubmit = async (payload) => {
  if (!payload.name?.trim()) {
    toast.add({ severity: 'error', summary: 'Validation', detail: 'Role name is required', life: 3000 })
    return
  }
  isSubmitting.value = true
  try {
    await createRole(payload)
    toast.add({ severity: 'success', summary: 'Created', detail: 'Role created successfully', life: 3000 })
    router.push('/roles')
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error || err.message, life: 5000 })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.role-new-view { padding: 1.5rem 2rem; max-width: 1000px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--p-text-color); }
.section-card {
  background: var(--p-content-background);
  border: 1px solid var(--p-surface-200);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--p-surface-100);
  padding-bottom: 0.75rem;
}
.card-header h2 {
  font-size: 1.15rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-color);
}
.card-header h2 i { color: var(--p-primary-color); }
</style>

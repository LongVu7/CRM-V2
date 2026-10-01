<template>
  <div class="role-detail-view">
    <div class="page-header">
      <h1>Edit Role #{{ $route.params.id }}</h1>
      <Button label="Back to Roles" severity="secondary" icon="pi pi-arrow-left" @click="$router.push('/roles')" />
    </div>

    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <p>Loading role...</p>
    </div>

    <div v-else-if="notFound" class="empty-state">
      <i class="pi pi-exclamation-triangle"></i>
      <h3>Role Not Found</h3>
      <Button label="Back to Roles" icon="pi pi-arrow-left" @click="$router.push('/roles')" />
    </div>

    <div v-else class="section-card">
      <div class="card-header">
        <h2><i class="pi pi-shield"></i> Edit Role</h2>
      </div>
      <RoleForm
        :role="existingRole"
        :isEditing="true"
        :isSubmitting="isSubmitting"
        @submit="handleSubmit"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useRole } from '@/composables/useRole'
import RoleForm from '@/components/role/RoleForm.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { fetchRoleById, updateRole } = useRole()

const existingRole = ref({ name: '', description: '', permissionIds: [] })
const loading = ref(true)
const notFound = ref(false)
const isSubmitting = ref(false)

onMounted(async () => {
  try {
    const data = await fetchRoleById(route.params.id)
    if (data) {
      existingRole.value = {
        name: data.name || '',
        description: data.description || '',
        permissionIds: data.permissionIds || []
      }
    } else {
      notFound.value = true
    }
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
})

const handleSubmit = async (payload) => {
  isSubmitting.value = true
  try {
    await updateRole(route.params.id, payload)
    toast.add({ severity: 'success', summary: 'Updated', detail: 'Role updated successfully', life: 3000 })
    router.push('/roles')
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error || err.message, life: 5000 })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.role-detail-view { padding: 1.5rem 2rem; max-width: 1000px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--p-text-color); }
.loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; padding: 4rem; gap: 0.75rem; color: var(--p-text-muted-color); }
.empty-state i { font-size: 3rem; color: var(--p-orange-400); }
.empty-state h3 { margin: 0 0 1rem 0; color: var(--p-text-color); }
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

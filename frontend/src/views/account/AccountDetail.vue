<template>
  <div class="account-detail-view">
    <div class="page-header">
      <h1>Edit Account #{{ $route.params.id }}</h1>
      <Button label="Back to List" severity="secondary" icon="pi pi-arrow-left" @click="$router.push('/accounts')" />
    </div>

    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <p>Loading account details...</p>
    </div>

    <div v-else-if="notFound" class="empty-state">
      <i class="pi pi-exclamation-triangle"></i>
      <h3>Account Not Found</h3>
      <Button label="Back to List" icon="pi pi-arrow-left" @click="$router.push('/accounts')" />
    </div>

    <div v-else class="section-card">
      <div class="card-header">
        <h2><i class="pi pi-pencil"></i> Edit Account</h2>
      </div>
      <AccountForm
        :account="existingAccount"
        :roles="roles"
        :groups="groups"
        :isSubmitting="isSubmitting"
        :isEditing="true"
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
import AccountForm from '@/components/account/AccountForm.vue'
import { useAccount } from '@/composables/useAccount'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { fetchAccountById, updateAccount, roles, groups, fetchRoles, fetchGroups } = useAccount()

const existingAccount = ref({
  fullName: '',
  email: '',
  roleId: null,
  groupId: null,
  isActive: true
})

const loading = ref(true)
const notFound = ref(false)
const isSubmitting = ref(false)

onMounted(async () => {
  try {
    const [accData] = await Promise.all([
      fetchAccountById(route.params.id),
      fetchRoles(),
      fetchGroups()
    ])
    if (accData) {
      existingAccount.value = {
        fullName: accData.fullName || '',
        email: accData.email || '',
        roleId: accData.roleId || null,
        groupId: accData.groupId || null,
        isActive: accData.isActive !== undefined ? accData.isActive : true
      }
    } else {
      notFound.value = true
    }
  } catch (error) {
    notFound.value = true
  } finally {
    loading.value = false
  }
})

const handleSubmit = async (payload) => {
  isSubmitting.value = true
  try {
    await updateAccount(route.params.id, payload)
    toast.add({ severity: 'success', summary: 'Success', detail: 'Account updated successfully', life: 3000 })
    router.push('/accounts')
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: error.response?.data?.error || error.message || 'Failed to update account', life: 5000 })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.account-detail-view { padding: 1.5rem 2rem; max-width: 800px; margin: 0 auto; }
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

.card-header h2 i {
  color: var(--p-primary-color);
}
</style>

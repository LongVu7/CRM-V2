<template>
  <div class="account-new-view">
    <div class="page-header">
      <h1>New Account</h1>
      <Button label="Back to List" severity="secondary" icon="pi pi-arrow-left" @click="$router.push('/accounts')" />
    </div>

    <div class="section-card">
      <div class="card-header">
        <h2><i class="pi pi-user-plus"></i> Create Account</h2>
      </div>
      <AccountForm
        :account="newAccount"
        :roles="roles"
        :groups="groups"
        :isSubmitting="isSubmitting"
        @submit="handleSubmit"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import AccountForm from '@/components/account/AccountForm.vue'
import { useAccount } from '@/composables/useAccount'

const router = useRouter()
const toast = useToast()
const { createAccount, roles, groups, fetchRoles, fetchGroups } = useAccount()

const newAccount = ref({
  fullName: '',
  email: '',
  password: '',
  roleId: null,
  groupId: null
})

const isSubmitting = ref(false)

onMounted(async () => {
  await Promise.all([
    fetchRoles(),
    fetchGroups()
  ])
})

const handleSubmit = async (payload) => {
  isSubmitting.value = true
  try {
    await createAccount(payload)
    toast.add({ severity: 'success', summary: 'Success', detail: 'Account created successfully', life: 3000 })
    router.push('/accounts')
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: error.response?.data?.error || error.message || 'Failed to create account', life: 5000 })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.account-new-view { padding: 1.5rem 2rem; max-width: 800px; margin: 0 auto; }
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

.card-header h2 i {
  color: var(--p-primary-color);
}
</style>

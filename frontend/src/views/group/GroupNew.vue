<template>
  <div class="group-new-view">
    <div class="page-header">
      <h1>New Group</h1>
      <Button label="Back to List" severity="secondary" icon="pi pi-arrow-left" @click="$router.push('/groups')" />
    </div>

    <div class="section-card">
      <div class="card-header">
        <h2><i class="pi pi-folder-plus"></i> Create Group</h2>
      </div>
      <GroupForm
        :group="newGroup"
        :accounts="accounts"
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
import GroupForm from '@/components/group/GroupForm.vue'
import { useGroup } from '@/composables/useGroup'
import { useAccount } from '@/composables/useAccount'

const router = useRouter()
const toast = useToast()
const { createGroup } = useGroup()
const { accounts, fetchAccounts } = useAccount()

const newGroup = ref({
  name: '',
  groupLeaderId: null
})

const isSubmitting = ref(false)

onMounted(async () => {
  try {
    await fetchAccounts()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load accounts for selection', life: 5000 })
  }
})

const handleSubmit = async (payload) => {
  isSubmitting.value = true
  try {
    await createGroup(payload)
    toast.add({ severity: 'success', summary: 'Success', detail: 'Group created successfully', life: 3000 })
    router.push('/groups')
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: error.response?.data?.error || error.message || 'Failed to create group', life: 5000 })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.group-new-view { padding: 1.5rem 2rem; max-width: 800px; margin: 0 auto; }
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

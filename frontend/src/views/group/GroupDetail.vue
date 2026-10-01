<template>
  <div class="group-detail-view">
    <div class="page-header">
      <h1>Edit Group #{{ $route.params.id }}</h1>
      <Button label="Back to List" severity="secondary" icon="pi pi-arrow-left" @click="$router.push('/groups')" />
    </div>

    <div v-if="loadingGroup" class="loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <p>Loading group details...</p>
    </div>

    <div v-else-if="notFound" class="empty-state">
      <i class="pi pi-exclamation-triangle"></i>
      <h3>Group Not Found</h3>
      <Button label="Back to List" icon="pi pi-arrow-left" @click="$router.push('/groups')" />
    </div>

    <div v-else class="cards-container">
      <!-- Edit Group Form -->
      <div class="section-card">
        <div class="card-header">
          <h2><i class="pi pi-pencil"></i> Edit Group Info</h2>
        </div>
        <GroupForm
          :group="existingGroup"
          :accounts="accounts"
          :isSubmitting="isSubmitting"
          @submit="handleSubmit"
        />
      </div>

      <!-- Membership Management -->
      <GroupMembers
        :members="linkedMembers"
        :allAccounts="accounts"
        :isAdding="isAddingMember"
        @add-member="handleAddMember"
        @remove-member="handleRemoveMember"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import GroupForm from '@/components/group/GroupForm.vue'
import GroupMembers from '@/components/group/GroupMembers.vue'
import { useGroup } from '@/composables/useGroup'
import { useAccount } from '@/composables/useAccount'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const { fetchGroupById, updateGroup, addMember, removeMember } = useGroup()
const { accounts, fetchAccounts } = useAccount()

const existingGroup = ref({
  name: '',
  groupLeaderId: null
})
const linkedMembers = ref([])

const loadingGroup = ref(true)
const notFound = ref(false)
const isSubmitting = ref(false)
const isAddingMember = ref(false)

const loadGroupData = async () => {
  try {
    const data = await fetchGroupById(route.params.id)
    if (data) {
      existingGroup.value = {
        name: data.name || '',
        groupLeaderId: data.groupLeaderId || null,
        permissionIds: data.permissionIds || []
      }
      linkedMembers.value = data.accounts || []
    } else {
      notFound.value = true
    }
  } catch (error) {
    notFound.value = true
  }
}

onMounted(async () => {
  loadingGroup.value = true
  try {
    await Promise.all([
      loadGroupData(),
      fetchAccounts()
    ])
  } catch (error) {
    // Handled
  } finally {
    loadingGroup.value = false
  }
})

const handleSubmit = async (payload) => {
  isSubmitting.value = true
  try {
    await updateGroup(route.params.id, payload)
    toast.add({ severity: 'success', summary: 'Success', detail: 'Group updated successfully', life: 3000 })
    router.push('/groups')
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: error.response?.data?.error || error.message || 'Failed to update group', life: 5000 })
  } finally {
    isSubmitting.value = false
  }
}

const handleAddMember = async (accountId) => {
  isAddingMember.value = true
  try {
    await addMember(route.params.id, accountId)
    toast.add({ severity: 'success', summary: 'Success', detail: 'Member added to group successfully', life: 3000 })
    await loadGroupData() // refresh members
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: error.response?.data?.error || error.message || 'Failed to add member', life: 5000 })
  } finally {
    isAddingMember.value = false
  }
}

const handleRemoveMember = async (accountId) => {
  try {
    await removeMember(route.params.id, accountId)
    toast.add({ severity: 'success', summary: 'Success', detail: 'Member removed from group successfully', life: 3000 })
    await loadGroupData() // refresh members
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: error.response?.data?.error || error.message || 'Failed to remove member', life: 5000 })
  }
}
</script>

<style scoped>
.group-detail-view { padding: 1.5rem 2rem; max-width: 900px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--p-text-color); }
.loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; padding: 4rem; gap: 0.75rem; color: var(--p-text-muted-color); }
.empty-state i { font-size: 3rem; color: var(--p-orange-400); }
.empty-state h3 { margin: 0 0 1rem 0; color: var(--p-text-color); }

.cards-container { display: flex; flex-direction: column; gap: 1.5rem; }

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

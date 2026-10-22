<template>
  <div class="team-detail-view">
    <div class="page-header">
      <h1>Edit Team #{{ $route.params.id }}</h1>
      <Button label="Back to List" severity="secondary" icon="pi pi-arrow-left" @click="$router.push('/teams')" />
    </div>

    <div v-if="loadingTeam" class="loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <p>Loading team details...</p>
    </div>

    <div v-else-if="notFound" class="empty-state">
      <i class="pi pi-exclamation-triangle"></i>
      <h3>Team Not Found</h3>
      <Button label="Back to List" icon="pi pi-arrow-left" @click="$router.push('/teams')" />
    </div>

    <div v-else class="cards-container">
      <div class="section-card">
        <!-- TeamMembers - Add member to team -->
        <TeamMembers
          :members="linkedMembers"
          :allAccounts="availableAccounts"
          :isAdding="isAddingMember"
          @add-member="handleAddMember"
          @remove-member="handleRemoveMember"
        />
        <!-- TeamForm - specify privileges and metadata -->
        <TeamForm
          :team="existingTeam"
          :accounts="availableAccounts"
          :isSubmitting="isSubmitting"
          buttonText="Save Changes"
          @submit="handleSubmit"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import TeamForm from '@/components/team/TeamForm.vue'
import TeamMembers from '@/components/team/TeamMembers.vue'
import { useTeam } from '@/composables/useTeam'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const {
  fetchTeamById,
  updateTeam,
  addMember,
  removeMember,
  updatePermissions,
  availableAccounts,
  fetchAvailableAccounts
} = useTeam()

const existingTeam = ref({
  name: '',
  description: '',
  leaderId: null,
  permissionIds: []
})
const linkedMembers = ref([])

const loadingTeam = ref(true)
const notFound = ref(false)
const isSubmitting = ref(false)
const isAddingMember = ref(false)

const loadTeamData = async () => {
  try {
    const data = await fetchTeamById(route.params.id)
    if (data) {
      existingTeam.value = {
        name: data.name || '',
        description: data.description || '',
        leaderId: data.leader ? data.leader.id : null,
        permissionIds: (data.permissions || []).map(p => ({
          permissionId: p.permissionId ?? p,
          scope: p.scope || 'TEAM_ONLY'
        }))
      }
      linkedMembers.value = data.members || []
    } else {
      notFound.value = true
    }
  } catch {
    notFound.value = true
  }
}

onMounted(async () => {
  loadingTeam.value = true
  try {
    await Promise.all([
      loadTeamData(),
      fetchAvailableAccounts()
    ])
  } catch {
    // Handled
  } finally {
    loadingTeam.value = false
  }
})

const handleSubmit = async (payload) => {
  isSubmitting.value = true
  try {
    await updateTeam(route.params.id, {
      name: payload.name,
      description: payload.description,
      leaderId: payload.leaderId
    })

    if (Array.isArray(payload.permissionIds)) {
      const perms = payload.permissionIds.map(p => ({
        permissionId: typeof p === 'object' ? p.permissionId : p,
        scope: (typeof p === 'object' && p.scope) ? p.scope : 'TEAM_ONLY'
      }))
      await updatePermissions(route.params.id, perms)
    }

    toast.add({ severity: 'success', summary: 'Success', detail: 'Team updated successfully', life: 3000 })
    await loadTeamData()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.error || error.message || 'Failed to update team',
      life: 5000
    })
  } finally {
    isSubmitting.value = false
  }
}

const handleAddMember = async (accountId) => {
  isAddingMember.value = true
  try {
    await addMember(route.params.id, accountId)
    toast.add({ severity: 'success', summary: 'Success', detail: 'Member added to team', life: 3000 })
    await loadTeamData()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.error || error.message || 'Failed to add member',
      life: 5000
    })
  } finally {
    isAddingMember.value = false
  }
}

const handleRemoveMember = async (accountId) => {
  try {
    await removeMember(route.params.id, accountId)
    toast.add({ severity: 'success', summary: 'Success', detail: 'Member removed from team', life: 3000 })
    await loadTeamData()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.error || error.message || 'Failed to remove member',
      life: 5000
    })
  }
}
</script>

<style scoped>
.team-detail-view {
  padding: 1.5rem 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--p-text-color);
}

.section-card {
  background: var(--p-content-background);
  border: 1px solid var(--p-surface-200);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.loading-state, .empty-state {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--p-text-muted-color);
}

.loading-state i, .empty-state i {
  color: var(--p-primary-color);
  margin-bottom: 0.75rem;
}

.empty-state i {
  font-size: 2.5rem;
}

.empty-state h3 {
  margin: 0 0 1rem 0;
  color: var(--p-text-color);
}
</style>

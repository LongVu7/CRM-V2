<template>
  <div class="team-new-view">
    <div class="page-header">
      <h1>New Team</h1>
      <Button label="Back to List" severity="secondary" icon="pi pi-arrow-left" @click="$router.push('/teams')" />
    </div>

    <div class="section-card">
      <div class="card-header">
        <h2><i class="pi pi-users"></i> Create Team</h2>
      </div>
      <TeamForm
        :team="newTeam"
        :parentOptions="parentOptions"
        :accounts="availableAccounts"
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
import TeamForm from '@/components/team/TeamForm.vue'
import { useTeam } from '@/composables/useTeam'

const router = useRouter()
const toast = useToast()
const {
  createTeam,
  fetchAvailableAccounts,
  availableAccounts,
  fetchParentOptions,
  parentOptions
} = useTeam()

const newTeam = ref({
  name: '',
  description: '',
  parentId: null,
  leaderId: null
})

const isSubmitting = ref(false)

onMounted(async () => {
  try {
    await Promise.all([
      fetchAvailableAccounts(),
      fetchParentOptions()
    ])
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load options for team form', life: 5000 })
  }
})

const handleSubmit = async (payload) => {
  isSubmitting.value = true
  try {
    await createTeam({
      name: payload.name,
      description: payload.description,
      parentId: payload.parentId,
      leaderId: payload.leaderId
    })

    toast.add({ severity: 'success', summary: 'Success', detail: 'Team created successfully', life: 3000 })
    router.push('/teams')
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.error || error.message || 'Failed to create team',
      life: 5000
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.team-new-view {
  padding: 1.5rem 2rem;
  max-width: 800px;
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

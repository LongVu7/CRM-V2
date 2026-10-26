<template>
  <div class="team-list-view">
    <div class="page-header">
      <div class="header-left">
        <h1><i class="pi pi-users"></i> Team Management</h1>
        <Tag :value="`${teamCount} teams`" severity="info" rounded />
      </div>
      <div class="header-actions" v-if="isAdmin">
        <Button label="New Team" icon="pi pi-plus" @click="$router.push('/admin/teams/new')" />
      </div>
    </div>

    <TeamList />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import TeamList from '@/components/team/TeamList.vue'
import { useTeam } from '@/composables/useTeam'
import { useAuthStore } from '@/stores/auth'
import { useAbility } from '@casl/vue'

const authStore = useAuthStore()
const { can } = useAbility()

const isAdmin = computed(() => {
  const role = (authStore.user?.roleName || '').toLowerCase()
  return role === 'admin' || role === 'administrator' || can('manage', 'all')
})

const { teams, fetchTeams } = useTeam()

onMounted(async () => {
  try {
    await fetchTeams()
  } catch {
    // handled inside component or toast
  }
})

const teamCount = computed(() => teams.value.length)
</script>

<style scoped>
.team-list-view {
  padding: 1.5rem 2rem;
  max-width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-left h1 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--p-text-color);
}

.header-left h1 i {
  color: var(--p-primary-color);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .team-list-view {
    padding: 1rem;
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

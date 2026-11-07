<template>
  <div class="my-team-view">
    <div class="page-header">
      <h1><i class="pi pi-users"></i> My Team</h1>
      <Button
        v-if="team && can('update', 'team')"
        label="Manage Team"
        icon="pi pi-cog"
        severity="secondary"
        @click="$router.push('/teams/' + team.id)"
      />
    </div>

    <div v-if="loading" class="state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <p>Loading your team...</p>
    </div>

    <div v-else-if="!team" class="state">
      <i class="pi pi-users" style="font-size: 2.5rem"></i>
      <h3>You are not in any team yet</h3>
      <p>Ask your administrator to add you to a team.</p>
    </div>

    <template v-else>
      <div class="section-card team-info">
        <div>
          <h2>{{ team.name }}</h2>
          <p class="muted">{{ team.description || 'No description' }}</p>
          <span v-if="team.parent" class="muted"><i class="pi pi-level-up"></i> Part of {{ team.parent.name }}</span>
        </div>
        <div class="leader-box">
          <span class="label">Team Leader</span>
          <template v-if="team.leader">
            <strong>{{ team.leader.fullName }}</strong>
            <a :href="'mailto:' + team.leader.email" class="muted">{{ team.leader.email }}</a>
          </template>
          <span v-else class="muted">— No leader assigned</span>
        </div>
      </div>

      <div class="section-card">
        <div class="members-header">
          <h3>Members <Tag :value="String(team.members.length)" rounded /></h3>
          <IconField>
            <InputIcon class="pi pi-search" />
            <InputText v-model="filters.global.value" placeholder="Search members..." />
          </IconField>
        </div>
        <DataTable
          :value="team.members"
          v-model:filters="filters"
          :globalFilterFields="['fullName', 'email']"
          dataKey="id"
          stripedRows
          removableSort
        >
          <template #empty>No members in this team.</template>
          <Column field="fullName" header="Name" sortable>
            <template #body="{ data }">
              {{ data.fullName || '—' }}
              <Tag v-if="data.id === team.leader?.id" value="Leader" severity="warn" class="ml" />
              <Tag v-if="data.id === myId" value="You" severity="info" class="ml" />
            </template>
          </Column>
          <Column field="email" header="Email" sortable>
            <template #body="{ data }"><a :href="'mailto:' + data.email">{{ data.email }}</a></template>
          </Column>
          <Column header="Role">
            <template #body="{ data }">{{ data.teamRole?.name || data.accountRole?.name || '—' }}</template>
          </Column>
          <Column field="joinedAt" header="Joined" sortable>
            <template #body="{ data }">{{ data.joinedAt ? new Date(data.joinedAt).toLocaleDateString() : '—' }}</template>
          </Column>
        </DataTable>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import { useToast } from 'primevue/usetoast'
import { useAbility } from '@casl/vue'
import { useAuthStore } from '@/stores/auth'
import { useTeam } from '@/composables/useTeam'

const authStore = useAuthStore()
const toast = useToast()
const { can } = useAbility()
const { team, fetchTeamById } = useTeam()

const loading = ref(true)
const filters = ref({ global: { value: null, matchMode: 'contains' } })
const myId = computed(() => authStore.user?.accountId)

onMounted(async () => {
  // A user belongs to one team: the one they lead, or the one they are a member of
  const teamId = authStore.user?.ledTeamIds?.[0] || authStore.user?.memberTeamId
  try {
    if (teamId) await fetchTeamById(teamId)
  } catch (err) {
    team.value = null
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error || 'Failed to load your team', life: 5000 })
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.my-team-view { padding: 1.5rem 2rem; max-width: 1100px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.page-header h1 { display: flex; gap: 0.5rem; align-items: center; font-size: 1.5rem; margin: 0; }
.page-header h1 i { color: var(--p-primary-color); }
.section-card {
  background: var(--p-content-background);
  border: 1px solid var(--p-surface-200);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.25rem;
}
.team-info { display: flex; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; }
.team-info h2 { margin: 0 0 0.5rem; }
.leader-box { display: flex; flex-direction: column; gap: 0.25rem; min-width: 220px; }
.label { font-size: 0.75rem; text-transform: uppercase; color: var(--p-text-muted-color); }
.muted { color: var(--p-text-muted-color); margin: 0 0 0.5rem; }
.members-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap; }
.members-header h3 { margin: 0; display: flex; gap: 0.5rem; align-items: center; }
.ml { margin-left: 0.4rem; }
.state { text-align: center; padding: 4rem 1rem; color: var(--p-text-muted-color); }
.state i { color: var(--p-primary-color); }
@media (max-width: 768px) { .my-team-view { padding: 1rem; } }
</style>


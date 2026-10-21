<template>
  <div class="table-container">
    <DataTable
      :value="teams"
      :paginator="true"
      :rows="20"
      :rowsPerPageOptions="[10, 20, 50]"
      :loading="loading"
      v-model:filters="filters"
      :globalFilterFields="['name', 'leader.fullName']"
      dataKey="id"
      removableSort
      stripedRows
      showGridlines
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
      currentPageReportTemplate="Showing {first} to {last} of {totalRecords} teams"
    >
      <template #header>
        <div class="table-toolbar">
          <IconField>
            <InputIcon class="pi pi-search" />
            <InputText placeholder="Search teams..." @input="onGlobalFilter" :value="filters.global.value" class="search-input" />
          </IconField>
        </div>
      </template>

      <template #empty>
        <div class="empty-state">
          <i class="pi pi-users"></i>
          <h3>No teams found</h3>
          <p>Get started by creating a new team.</p>
          <div class="empty-actions">
            <Button label="New Team" icon="pi pi-plus" @click="$router.push('/teams/new')" />
          </div>
        </div>
      </template>

      <template #loading>
        <div class="loading-state">
          <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
          <p>Loading teams...</p>
        </div>
      </template>

      <Column field="name" header="Team Name" sortable style="min-width: 200px">
        <template #body="{ data }"><span class="team-name">{{ data.name }}</span></template>
      </Column>
      <Column field="leader.fullName" header="Leader" sortable style="min-width: 200px">
        <template #body="{ data }">
          <span v-if="data.leader" class="leader-name">
            <i class="pi pi-user-plus icon-small"></i> {{ data.leader.fullName }}
          </span>
          <span v-else class="null-text">— No Leader</span>
        </template>
      </Column>
      <Column field="memberCount" header="Members" sortable style="width: 120px; text-align: center;">
        <template #body="{ data }">
          <span class="member-count-badge">{{ data.memberCount }}</span>
        </template>
      </Column>
      <Column header="Actions" style="width: 120px" :exportable="false" frozen alignFrozen="right">
        <template #body="{ data }">
          <div class="action-buttons">
            <Button icon="pi pi-pencil" rounded text severity="info" size="small" v-tooltip.top="'Edit & Members'" @click="$router.push('/teams/' + data.id)" />
            <Button icon="pi pi-trash" rounded text severity="danger" size="small" v-tooltip.top="'Delete'" @click="confirmDeleteAction(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <ConfirmDialog />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import ConfirmDialog from 'primevue/confirmdialog'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useTeam } from '@/composables/useTeam'

const toast = useToast()
const confirm = useConfirm()
const { teams, loading, fetchTeams, deleteTeam } = useTeam()

const filters = ref({
  global: { value: null, matchMode: 'contains' }
})

onMounted(() => {
  loadData()
})

const loadData = async () => {
  try {
    await fetchTeams()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error || err.message || 'Failed to fetch teams', life: 5000 })
  }
}

const onGlobalFilter = (e) => {
  filters.value.global.value = e.target.value
}

const confirmDeleteAction = (teamData) => {
  confirm.require({
    message: `Are you sure you want to delete team "${teamData.name}"? Member accounts will remain in the system.`,
    header: 'Confirm Decommission',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await deleteTeam(teamData.id)
        toast.add({ severity: 'success', summary: 'Success', detail: 'Team deleted successfully', life: 3000 })
        await loadData()
      } catch (err) {
        toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error || err.message || 'Failed to delete team', life: 5000 })
      }
    }
  })
}
</script>

<style scoped>
.table-container {
  background: var(--p-content-background);
  border: 1px solid var(--p-surface-200);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
}

.search-input {
  min-width: 280px;
}

.team-name {
  font-weight: 600;
  color: var(--p-text-color);
}

.leader-name {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--p-text-color);
  font-weight: 500;
}

.icon-small {
  font-size: 0.85rem;
  color: var(--p-primary-color);
}

.member-count-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  background: var(--p-surface-100);
  color: var(--p-surface-700);
}

.null-text {
  color: var(--p-text-muted-color);
  font-style: italic;
  font-size: 0.875rem;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
  justify-content: center;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--p-text-muted-color);
}

.empty-state i {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  color: var(--p-primary-color);
  opacity: 0.6;
}

.empty-state h3 {
  font-size: 1.15rem;
  margin: 0 0 0.5rem 0;
  color: var(--p-text-color);
}

.empty-state p {
  margin: 0 0 1.25rem 0;
  font-size: 0.9rem;
}

.empty-actions {
  display: flex;
  justify-content: center;
}

.loading-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--p-text-muted-color);
}

.loading-state i {
  color: var(--p-primary-color);
  margin-bottom: 0.75rem;
}

.loading-state p {
  margin: 0;
}
</style>

<template>
  <div class="team-list-container">
    <!-- View Switcher & Toolbar -->
    <div class="toolbar-header">
      <div class="view-switch-group">
        <Button
          icon="pi pi-list"
          label="Table View"
          :severity="viewMode === 'table' ? 'primary' : 'secondary'"
          :outlined="viewMode !== 'table'"
          size="small"
          @click="viewMode = 'table'"
        />
        <Button
          icon="pi pi-sitemap"
          label="Hierarchy Tree"
          :severity="viewMode === 'tree' ? 'primary' : 'secondary'"
          :outlined="viewMode !== 'tree'"
          size="small"
          @click="switchView('tree')"
        />
      </div>

      <div class="right-actions">
        <IconField v-if="viewMode === 'table'">
          <InputIcon class="pi pi-search" />
          <InputText placeholder="Search teams..." @input="onGlobalFilter" :value="filters.global.value" class="search-input" />
        </IconField>
      </div>
    </div>

    <!-- Table View -->
    <div v-if="viewMode === 'table'" class="table-card">
      <DataTable
        :value="teams"
        :paginator="true"
        :rows="20"
        :rowsPerPageOptions="[10, 20, 50]"
        :loading="loading"
        v-model:filters="filters"
        :globalFilterFields="['name', 'leader.fullName', 'parent.name']"
        dataKey="id"
        removableSort
        stripedRows
        showGridlines
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} teams"
      >
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-users"></i>
            <h3>No teams found</h3>
            <p>Get started by creating a new team.</p>
            <div class="empty-actions" v-if="isAdmin">
              <Button label="New Team" icon="pi pi-plus" @click="$router.push('/admin/teams/new')" />
            </div>
          </div>
        </template>

        <template #loading>
          <div class="loading-state">
            <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
            <p>Loading teams...</p>
          </div>
        </template>

        <Column field="name" header="Team Name" sortable style="min-width: 220px">
          <template #body="{ data }">
            <div class="team-name-cell">
              <span class="team-name">{{ data.name }}</span>
              <span
                v-if="data.childrenCount > 0"
                class="subteams-pill"
                v-tooltip.top="`${data.childrenCount} descendant sub-team(s)`"
              >
                <i class="pi pi-sitemap"></i> {{ data.childrenCount }} sub-team{{ data.childrenCount > 1 ? 's' : '' }}
              </span>
            </div>
          </template>
        </Column>

        <Column field="parent.name" header="Parent Team" sortable style="min-width: 180px">
          <template #body="{ data }">
            <span v-if="data.parent" class="parent-badge">
              <i class="pi pi-level-up"></i> {{ data.parent.name }}
            </span>
            <span v-else class="root-badge">
              <i class="pi pi-home"></i> Root Team
            </span>
          </template>
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
              <Button v-if="isAdmin" icon="pi pi-trash" rounded text severity="danger" size="small" v-tooltip.top="'Delete'" @click="confirmDeleteAction(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Hierarchy Tree View -->
    <div v-else class="tree-card">
      <div v-if="loadingTree" class="loading-state">
        <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
        <p>Loading team hierarchy tree...</p>
      </div>

      <div v-else-if="teamTree.length === 0" class="empty-state">
        <i class="pi pi-sitemap"></i>
        <h3>No teams found</h3>
        <p>Create teams to view their organizational tree structure.</p>
      </div>

      <div v-else class="tree-content">
        <div class="tree-legend">
          <span class="legend-item"><i class="pi pi-home icon-small"></i> Root Teams</span>
          <span class="legend-item"><i class="pi pi-level-down icon-small"></i> Sub-teams inherit parent scopes</span>
        </div>
        <div class="tree-nodes">
          <TeamTreeNode
            v-for="rootNode in teamTree"
            :key="rootNode.id"
            :node="rootNode"
            :depth="0"
            @edit="id => $router.push('/teams/' + id)"
            @delete="confirmDeleteAction"
          />
        </div>
      </div>
    </div>

    <ConfirmDialog />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
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
import { useAuthStore } from '@/stores/auth'
import { useAbility } from '@casl/vue'
import TeamTreeNode from '@/components/team/TeamTreeNode.vue'

const toast = useToast()
const confirm = useConfirm()
const authStore = useAuthStore()
const { can } = useAbility()

const isAdmin = computed(() => {
  const role = (authStore.user?.roleName || '').toLowerCase()
  return role === 'admin' || role === 'administrator' || can('manage', 'all')
})

const { teams, teamTree, loading, fetchTeams, fetchTeamTree, deleteTeam } = useTeam()

const viewMode = ref('table')
const loadingTree = ref(false)

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

const switchView = async (mode) => {
  viewMode.value = mode
  if (mode === 'tree') {
    loadingTree.value = true
    try {
      await fetchTeamTree()
    } catch (err) {
      toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error || err.message || 'Failed to fetch team tree', life: 5000 })
    } finally {
      loadingTree.value = false
    }
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
        if (viewMode.value === 'tree') {
          await fetchTeamTree()
        }
        await loadData()
      } catch (err) {
        toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error || err.message || 'Failed to delete team', life: 5000 })
      }
    }
  })
}
</script>

<style scoped>
.team-list-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.toolbar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.view-switch-group {
  display: flex;
  gap: 0.5rem;
}

.right-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.table-card, .tree-card {
  background: var(--p-content-background);
  border: 1px solid var(--p-surface-200);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.tree-card {
  padding: 1.5rem;
}

.tree-legend {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--p-surface-200);
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.search-input {
  min-width: 280px;
}

.team-name-cell {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.team-name {
  font-weight: 600;
  color: var(--p-text-color);
}

.subteams-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: #eff4fa;
  color: #3b65b5;
  border: 1px solid #bed5ee;
}

.parent-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  background: var(--p-surface-100);
  color: var(--p-surface-800);
  font-weight: 500;
}

.root-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
  font-style: italic;
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


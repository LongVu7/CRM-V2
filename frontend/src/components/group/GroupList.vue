<template>
  <div class="table-container">
    <DataTable
      :value="groups"
      :paginator="true"
      :rows="20"
      :rowsPerPageOptions="[10, 20, 50]"
      :loading="loading"
      v-model:filters="filters"
      :globalFilterFields="['name', 'groupLeader.fullName']"
      dataKey="id"
      removableSort
      stripedRows
      showGridlines
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
      currentPageReportTemplate="Showing {first} to {last} of {totalRecords} groups"
    >
      <template #header>
        <div class="table-toolbar">
          <IconField>
            <InputIcon class="pi pi-search" />
            <InputText placeholder="Search groups..." @input="onGlobalFilter" :value="filters.global.value" class="search-input" />
          </IconField>
        </div>
      </template>

      <template #empty>
        <div class="empty-state">
          <i class="pi pi-folder-open"></i>
          <h3>No groups found</h3>
          <p>Get started by creating a new group.</p>
          <div class="empty-actions">
            <Button label="New Group" icon="pi pi-plus" @click="$router.push('/groups/new')" />
          </div>
        </div>
      </template>

      <template #loading>
        <div class="loading-state">
          <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
          <p>Loading groups...</p>
        </div>
      </template>

      <Column field="name" header="Group Name" sortable style="min-width: 200px">
        <template #body="{ data }"><span class="group-name">{{ data.name }}</span></template>
      </Column>
      <Column field="groupLeader.fullName" header="Leader" sortable style="min-width: 200px">
        <template #body="{ data }">
          <span v-if="data.groupLeader" class="leader-name">
            <i class="pi pi-user-plus icon-small"></i> {{ data.groupLeader.fullName }}
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
            <Button icon="pi pi-pencil" rounded text severity="info" size="small" v-tooltip.top="'Edit & Members'" @click="$router.push('/groups/' + data.id)" />
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
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import ConfirmDialog from 'primevue/confirmdialog'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useGroup } from '@/composables/useGroup'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const { groups, loading, fetchGroups, deleteGroup } = useGroup()

const filters = ref({
  global: { value: null, matchMode: 'contains' }
})

onMounted(() => {
  loadData()
})

const loadData = async () => {
  try {
    await fetchGroups()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load groups', life: 5000 })
  }
}

const confirmDeleteAction = (group) => {
  confirm.require({
    message: `Are you sure you want to delete the group "${group.name}"? Member accounts will be preserved.`,
    header: 'Delete Group',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancel',
    rejectProps: { severity: 'secondary', text: true },
    acceptLabel: 'Delete',
    acceptProps: { severity: 'danger' },
    accept: async () => {
      try {
        await deleteGroup(group.id)
        toast.add({ severity: 'success', summary: 'Deleted', detail: `Group "${group.name}" has been deleted`, life: 3000 })
        await loadData()
      } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.response?.data?.error || 'Failed to delete group', life: 5000 })
      }
    }
  })
}

const onGlobalFilter = (e) => {
  filters.value.global.value = e.target.value
}
</script>


<style scoped>
.table-container { background: var(--p-content-background); border-radius: 12px; overflow: hidden; border: 1px solid var(--p-surface-200); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); }
.table-toolbar { display: flex; justify-content: flex-end; }
.search-input { width: 280px; }
.group-name { font-weight: 600; color: var(--p-text-color); }
.leader-name { font-weight: 500; }
.icon-small { font-size: 0.85rem; color: var(--p-primary-color); margin-right: 0.25rem; }
.null-text { color: var(--p-text-muted-color); font-style: italic; }
.member-count-badge { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 12px; background: var(--p-surface-100); color: var(--p-text-color); font-weight: 600; font-size: 0.85rem; }
.action-buttons { display: flex; gap: 0.25rem; }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 3rem 1rem; gap: 0.5rem; color: var(--p-text-muted-color); }
.empty-state i { font-size: 3rem; margin-bottom: 0.5rem; opacity: 0.4; }
.empty-state h3 { margin: 0; font-size: 1.15rem; font-weight: 600; color: var(--p-text-color); }
.empty-state p { margin: 0; font-size: 0.9rem; }
.empty-actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
.loading-state { display: flex; flex-direction: column; align-items: center; padding: 2rem; gap: 0.75rem; color: var(--p-text-muted-color); }
@media (max-width: 768px) {
  .search-input { width: 100%; }
}
</style>

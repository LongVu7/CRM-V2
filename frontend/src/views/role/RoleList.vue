<template>
  <div class="role-list-view">
    <div class="page-header">
      <h1>Roles & Privileges</h1>
      <Button label="New Role" icon="pi pi-plus" @click="$router.push('/roles/new')" />
    </div>

    <div class="table-container">
      <DataTable
        :value="roles"
        :loading="loading"
        dataKey="id"
        stripedRows
        showGridlines
      >
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-shield"></i>
            <h3>No roles found</h3>
            <p>Create a new role to get started.</p>
            <Button label="New Role" icon="pi pi-plus" @click="$router.push('/roles/new')" />
          </div>
        </template>

        <Column field="id" header="ID" style="width: 60px"></Column>
        <Column field="name" header="Role Name" style="min-width: 150px">
          <template #body="{ data }">
            <span class="role-name">{{ data.name }}</span>
          </template>
        </Column>
        <Column field="description" header="Description" style="min-width: 200px">
          <template #body="{ data }">
            <span v-if="data.description">{{ data.description }}</span>
            <span v-else class="null-text">—</span>
          </template>
        </Column>
        <Column header="Permissions" style="width: 120px">
          <template #body="{ data }">
            <Tag :value="`${data._count?.permissions || 0} privileges`" severity="info" />
          </template>
        </Column>
        <Column header="Accounts" style="width: 110px">
          <template #body="{ data }">
            <Tag :value="`${data._count?.accounts || 0} users`" severity="secondary" />
          </template>
        </Column>
        <Column header="Actions" style="width: 120px" :exportable="false">
          <template #body="{ data }">
            <div class="action-buttons">
              <Button icon="pi pi-pencil" rounded text severity="info" size="small" v-tooltip.top="'Edit'" @click="$router.push('/roles/' + data.id)" />
              <Button icon="pi pi-trash" rounded text severity="danger" size="small" v-tooltip.top="'Delete'" @click="confirmDelete(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <ConfirmDialog />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useRole } from '@/composables/useRole'

const toast = useToast()
const confirm = useConfirm()
const { roles, loading, fetchRoles, deleteRole } = useRole()

onMounted(() => fetchRoles())

const confirmDelete = (role) => {
  confirm.require({
    message: `Are you sure you want to delete the role "${role.name}"?`,
    header: 'Delete Role',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancel',
    rejectProps: { severity: 'secondary', text: true },
    acceptLabel: 'Delete',
    acceptProps: { severity: 'danger' },
    accept: async () => {
      try {
        await deleteRole(role.id)
        toast.add({ severity: 'success', summary: 'Deleted', detail: `Role "${role.name}" deleted`, life: 3000 })
        await fetchRoles()
      } catch (err) {
        toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error || err.message, life: 5000 })
      }
    }
  })
}
</script>

<style scoped>
.role-list-view { padding: 1.5rem 2rem; max-width: 1000px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--p-text-color); }
.table-container { background: var(--p-content-background); border-radius: 12px; overflow: hidden; border: 1px solid var(--p-surface-200); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); }
.role-name { font-weight: 600; text-transform: capitalize; }
.null-text { color: var(--p-text-muted-color); }
.action-buttons { display: flex; gap: 0.25rem; }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 3rem 1rem; gap: 0.5rem; color: var(--p-text-muted-color); }
.empty-state i { font-size: 3rem; margin-bottom: 0.5rem; opacity: 0.4; }
.empty-state h3 { margin: 0; font-size: 1.15rem; font-weight: 600; color: var(--p-text-color); }
.empty-state p { margin: 0 0 1rem 0; font-size: 0.9rem; }
</style>

<template>
  <div class="table-container">
    <DataTable :value="inquiries" lazy :paginator="true" :rows="pagination?.limit || 20"
      :first="((pagination?.page || 1) - 1) * (pagination?.limit || 20)" :totalRecords="pagination?.totalCount || 0"
      :rowsPerPageOptions="[10, 20, 50, 100]" :loading="loading" @page="onPage" dataKey="id" removableSort stripedRows
      showGridlines
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
      currentPageReportTemplate="Showing {first} to {last} of {totalRecords} inquiries">
      <template #header>
        <div class="table-toolbar">
          <IconField>
            <InputIcon class="pi pi-search" />
            <InputText placeholder="Search inquiries (desc, student)..." @input="onSearch" :value="searchQuery"
              class="search-input" />
          </IconField>
          <div class="toolbar-actions" style="margin-left: auto;">
            <Button v-if="$can('export', 'inquiry')" label="Export" icon="pi pi-download" text
              @click="emit('export')" class="export-btn" :loading="exporting" />
          </div>
        </div>
      </template>

      <template #empty>
        <div class="empty-state">
          <i class="pi pi-inbox"></i>
          <h3>No inquiries found</h3>
          <p>Create a new inquiry to get started.</p>
          <Button label="New Inquiry" icon="pi pi-plus" @click="$router.push('/inquiries/new')" />
        </div>
      </template>
      
      <Column header="Assigned Account" style="min-width: 150px">
        <template #body="{ data }">
          <span v-if="data.assignedTo">{{ data.assignedTo.fullName }}</span>
          <span v-else class="null-text">—</span>
        </template>
      </Column>
      <Column header="Student" style="min-width: 150px">
        <template #body="{ data }">
          <span v-if="data.student">{{ data.student.fullName }}</span>
          <span v-else class="null-text">—</span>
        </template>
      </Column>
      <Column header="Interaction Status" style="min-width: 150px">
        <template #body="{ data }">
          <span class="status-breadcrumb">{{ getStatusLevel(data.statusData, 'interaction') }}</span>
        </template>
      </Column>
      <Column header="General Status" style="min-width: 150px">
        <template #body="{ data }">
          <span class="status-breadcrumb">{{ getStatusLevel(data.statusData, 'general') }}</span>
        </template>
      </Column>
      <Column header="Detail Status" style="min-width: 150px">
        <template #body="{ data }">
          <span class="status-breadcrumb">{{ getStatusLevel(data.statusData, 'detail') }}</span>
        </template>
      </Column>

      <Column field="description" header="Description" style="min-width: 200px">
        <template #body="{ data }">
          <span v-if="data.description" class="desc-text">{{ data.description.length > 60 ?
            data.description.substring(0, 60) + '...' : data.description }}</span>
          <span v-else class="null-text">—</span>
        </template>
      </Column>
      <Column field="createdAt" header="Created" sortable style="width: 150px">
        <template #body="{ data }">
          <span class="date-text">{{ formatCompactDate(data.createdAt) }}</span>
        </template>
      </Column>
      <Column header="Actions" style="width: 120px" :exportable="false" frozen alignFrozen="right">
        <template #body="{ data }">
          <div class="action-buttons">
            <Button icon="pi pi-eye" rounded text severity="info" size="small" v-tooltip.top="'Show'"
              @click="emit('show', data.id)" />
            <Button v-if="$can('delete', 'inquiry')" icon="pi pi-trash" rounded text severity="danger" size="small" v-tooltip.top="'Delete'"
              @click="confirmDeleteAction(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <ConfirmDialog />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'
import { getStatusLevel } from '@/utils/inquiryLabels'
import { formatCompactDate } from '@/utils/dateUtils'

const props = defineProps({
  inquiries: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  exporting: { type: Boolean, default: false },
  pagination: { type: Object, default: null }
})

const emit = defineEmits(['page-change', 'search', 'delete', 'show', 'export'])

const router = useRouter()
const confirm = useConfirm()

const searchQuery = ref('')
let searchTimeout = null

const onPage = (event) => {
  const page = Math.floor(event.first / event.rows) + 1
  emit('page-change', { page, limit: event.rows })
}

const onSearch = (e) => {
  searchQuery.value = e.target.value
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    emit('search', searchQuery.value)
  }, 500)
}

const confirmDeleteAction = (inquiry) => {
  confirm.require({
    message: `Are you sure you want to delete inquiry #${inquiry.id}? Student records will be preserved.`,
    header: 'Delete Inquiry',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancel',
    rejectProps: { severity: 'secondary', text: true },
    acceptLabel: 'Delete',
    acceptProps: { severity: 'danger' },
    accept: () => {
      emit('delete', inquiry.id)
    }
  })
}
</script>

<style scoped>
.table-container {
  background: var(--p-content-background);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--p-surface-200);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.table-toolbar {
  display: flex;
  justify-content: flex-end;
}

.search-input {
  width: 280px;
}

.null-text {
  color: var(--p-text-muted-color);
}

.desc-text {
  font-size: 0.88rem;
}

.date-text {
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.status-breadcrumb {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 1rem;
  gap: 0.5rem;
  color: var(--p-text-muted-color);
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  opacity: 0.4;
}

.empty-state h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.empty-state p {
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
}
</style>

<template>
  <div class="table-container">
    <DataTable
      :value="schools"
      lazy
      :paginator="true"
      :rows="pagination?.limit || 20"
      :first="((pagination?.page || 1) - 1) * (pagination?.limit || 20)"
      :totalRecords="pagination?.totalCount || 0"
      :rowsPerPageOptions="[10, 20, 50, 100]"
      :loading="loading"
      @page="onPage"
      dataKey="id"
      removableSort
      stripedRows
      showGridlines
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
      currentPageReportTemplate="Showing {first} to {last} of {totalRecords} schools"
    >
      <template #header>
        <div class="table-toolbar">
          <Select v-model="selectedOldProvinceId" :options="oldProvinces" optionLabel="name" optionValue="id"
            placeholder="Filter by old province" :loading="loadingOldProvinces" filter showClear class="city-filter"
            @change="onOldProvinceFilter" />
          <IconField>
            <InputIcon class="pi pi-search" />
            <InputText placeholder="Search schools..." @input="onSearch" :value="searchQuery" class="search-input" />
          </IconField>
        </div>
      </template>

      <template #empty>
        <div class="empty-state">
          <i class="pi pi-building"></i>
          <h3>No schools found</h3>
          <p>Get started by creating a new school.</p>
          <div class="empty-actions">
            <Button label="New School" icon="pi pi-plus" @click="$router.push('/schools/new')" />
          </div>
        </div>
      </template>

      <template #loading>
        <div class="loading-state">
          <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
          <p>Loading schools...</p>
        </div>
      </template>

      <Column field="name" header="School Name" sortable style="min-width: 220px">
        <template #body="{ data }"><span class="school-name">{{ data.name }}</span></template>
      </Column>
      <Column header="Old Province" sortable style="min-width: 160px">
        <template #body="{ data }">
          <span v-if="data.oldProvince">{{ data.oldProvince.name }}</span>
          <span v-else class="null-text">—</span>
        </template>
      </Column>
      <Column field="schoolType" header="Type" sortable style="width: 130px">
        <template #body="{ data }">
          <Tag v-if="data.schoolType" :value="formatSchoolType(data.schoolType)" :severity="typeSeverity(data.schoolType)" />
          <span v-else class="null-text">—</span>
        </template>
      </Column>
      <Column field="createdAt" header="Created" sortable style="width: 160px">
        <template #body="{ data }"><span class="date-text">{{ formatDateTime(data.createdAt) }}</span></template>
      </Column>
      <Column header="Actions" style="width: 120px" :exportable="false" frozen alignFrozen="right">
        <template #body="{ data }">
          <div class="action-buttons">
            <Button icon="pi pi-pencil" rounded text severity="info" size="small" v-tooltip.top="'Edit'" @click="$router.push('/schools/' + data.id)" />
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
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'
import { useSchoolOptions } from '@/composables/useSchoolOptions'
import { formatDateTime } from '@/utils/dateUtils'
import { formatSchoolType, typeSeverity } from '@/utils/schoolLabels'

const props = defineProps({
  schools: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  pagination: { type: Object, default: null }
})

const emit = defineEmits(['page-change', 'search', 'delete', 'old-province-filter'])

const confirm = useConfirm()
const { oldProvinces, loadingOldProvinces, fetchOldProvinces } = useSchoolOptions()

const searchQuery = ref('')
const selectedOldProvinceId = ref(null)
let searchTimeout = null

onMounted(() => {
  fetchOldProvinces()
})

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

const onOldProvinceFilter = () => {
  emit('old-province-filter', selectedOldProvinceId.value)
}

const confirmDeleteAction = (school) => {
  confirm.require({
    message: `Are you sure you want to delete "${school.name}"? This action cannot be undone.`,
    header: 'Delete School',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancel',
    rejectProps: { severity: 'secondary', text: true },
    acceptLabel: 'Delete',
    acceptProps: { severity: 'danger' },
    accept: () => {
      emit('delete', school.id)
    }
  })
}
</script>

<style scoped>
.table-container { background: var(--p-content-background); border-radius: 12px; overflow: hidden; border: 1px solid var(--p-surface-200); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); }
.table-toolbar { display: flex; justify-content: flex-end; gap: 0.75rem; }
.city-filter { width: 220px; }
.search-input { width: 240px; }
.school-name { font-weight: 600; color: var(--p-text-color); }
.null-text { color: var(--p-text-muted-color); }
.date-text { font-size: 0.85rem; color: var(--p-text-muted-color); }
.action-buttons { display: flex; gap: 0.25rem; }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 3rem 1rem; gap: 0.5rem; color: var(--p-text-muted-color); }
.empty-state i { font-size: 3rem; margin-bottom: 0.5rem; opacity: 0.4; }
.empty-state h3 { margin: 0; font-size: 1.15rem; font-weight: 600; color: var(--p-text-color); }
.empty-state p { margin: 0; font-size: 0.9rem; }
.empty-actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
.loading-state { display: flex; flex-direction: column; align-items: center; padding: 2rem; gap: 0.75rem; color: var(--p-text-muted-color); }
@media (max-width: 768px) {
  .table-toolbar { flex-direction: column; }
  .city-filter, .search-input { width: 100%; }
}
</style>

<template>
  <div class="table-container">
    <DataTable :value="students" lazy :paginator="true" :rows="pagination?.limit || 20"
      :first="((pagination?.page || 1) - 1) * (pagination?.limit || 20)" :totalRecords="pagination?.totalCount || 0"
      :rowsPerPageOptions="[10, 20, 50, 100]" :loading="loading" @page="onPage" @sort="onSort"
      v-model:selection="selectedStudents" dataKey="id" :removableSort="true" :scrollable="true"
      :scrollHeight="'calc(100vh - 200px)'" class="student-datatable"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
      currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
      :paginatorLeft="true" :paginatorRight="true">
      <template #header>
        <!-- Primary Toolbar -->
        <div class="primary-toolbar">
          <div class="toolbar-spacer">

            <IconField>
              <InputIcon class="pi pi-search" />
              <InputText placeholder="Search students..." @input="onSearch" :value="searchQuery" class="search-input" />
            </IconField>
          </div>
          <div class="toolbar-actions">
            <Button v-if="$can('import', 'student')" label="Import" icon="pi pi-file-import" text
              @click="emit('open-import')" class="import-btn" />
            <Button v-if="$can('export', 'student')" label="Export" icon="pi pi-download" text
              @click="emit('export')" class="export-btn" :loading="exporting" />
            <Button v-if="$can('create', 'student')" label="New Student" icon="pi pi-plus"
              @click="$router.push('/students/new')" />
          </div>
        </div>

        <!-- Secondary Toolbar -->
        <div class="secondary-toolbar">
          <div class="secondary-left">
            <Button label="Filter" icon="pi pi-filter" outlined @click="toggleFilterPopover" class="filter-btn">
              <Badge v-if="activeFilterCount > 0" :value="activeFilterCount" class="filter-badge" />
            </Button>

            <span v-if="selectedStudents.length > 0" class="selection-count">
              {{ selectedStudents.length }} Selected
            </span>

            <span v-if="selectedStudents.length === 0" class="result-count">
              {{ pagination?.totalCount || 0 }} Results
            </span>
          </div>


        </div>

        <!-- Filter Popover -->
        <Popover ref="filterPopover" class="filter-popover">
          <div class="popover-content">
            <div class="filter-group">
              <label>Birth Year</label>
              <Select v-model="pendingFilters.birthYear" :options="birthYearOptions" optionLabel="label"
                optionValue="value" placeholder="Select..." showClear appendTo="self" class="w-full" />
            </div>
            <div class="filter-group">
              <label>Old Province</label>
              <Select v-model="pendingFilters.oldProvinceId" :options="oldProvinces" optionLabel="name" optionValue="id"
                placeholder="Select..." showClear appendTo="self" class="w-full" />
            </div>
            <div class="popover-actions">
              <Button label="Reset" text severity="secondary" size="small" @click="resetFilters" />
              <Button label="Apply" size="small" @click="applyFilters" />
            </div>
          </div>
        </Popover>
      </template>

      <template #empty>
        <div class="empty-state">
          <i class="pi pi-inbox"></i>
          <h3>No students found</h3>
          <p>Get started by creating a new student or importing from Excel.</p>
          <div class="empty-actions">
            <Button v-if="$can('create', 'student')" label="New Student" icon="pi pi-plus"
              @click="$router.push('/students/new')" />
          </div>
        </div>
      </template>

      <template #loading>
        <div class="loading-state">
          <i class="pi pi-spin pi-spinner" style="font-size: 1.5rem"></i>
          <p>Loading students...</p>
        </div>
      </template>

      <Column selectionMode="multiple" headerStyle="width: 2.5rem" bodyStyle="width: 2.5rem" />

      <Column field="fullName" header="Full Name" sortable style="min-width: 180px">
        <template #body="{ data }">
          <span class="student-name">{{ data.fullName || '—' }}</span>
        </template>
      </Column>

      <Column field="email" header="Email" sortable style="min-width: 180px">
        <template #body="{ data }">
          <span v-if="data.email" class="student-email">{{ data.email }}</span>
          <span v-else class="null-text">—</span>
        </template>
      </Column>

      <Column field="mobile" header="Mobile" sortable style="width: 120px">
        <template #body="{ data }">
          <span v-if="data.mobile">{{ data.mobile }}</span>
          <span v-else class="null-text">—</span>
        </template>
      </Column>

      <Column field="education.class" header="Class" sortable style="min-width: 100px">
        <template #body="{ data }">
          <span v-if="data.education?.class">{{ getClassLabel(data.education.class) }}</span>
          <span v-else class="null-text">—</span>
        </template>
      </Column>

      <Column field="education.school.name" header="School" sortable style="min-width: 160px">
        <template #body="{ data }">
          <span v-if="data.education?.school" class="school-cell" v-tooltip.top="data.education.school.name">
            {{ data.education.school.name }}
          </span>
          <span v-else class="null-text">—</span>
        </template>
      </Column>

      <Column field="education.school.oldProvince.name" header="Province" sortable style="min-width: 120px">
        <template #body="{ data }">
          <span v-if="data.education?.school?.oldProvince">{{ data.education.school.oldProvince.name }}</span>
          <span v-else class="null-text">—</span>
        </template>
      </Column>

      <Column header="GPA" style="min-width: 130px">
        <template #body="{ data }">
          <span v-if="data.specializedRegister?.gpa" class="gpa-badge">{{ getGpaLabel(data.specializedRegister.gpa)
          }}</span>
          <span v-else class="null-text">—</span>
        </template>
      </Column>

      <Column field="createdAt" header="Created" sortable style="width: 110px">
        <template #body="{ data }">
          <div class="created-cell">
            <span>{{ formatCompactDate(data.createdAt) }}</span>
            <span class="created-time">{{ formatCompactTime(data.createdAt) }}</span>
          </div>
        </template>
      </Column>

      <Column header="Actions" style="width: 90px" :exportable="false" frozen alignFrozen="right">
        <template #body="{ data }">
          <div class="action-buttons">
            <Button v-if="$can('read', 'student')" icon="pi pi-eye" rounded text severity="info"
              aria-label="Show Student" @click="emit('show', data.id)" />
            <Button v-if="$can('delete', 'student')" icon="pi pi-trash" rounded text severity="danger"
              aria-label="Delete Student" @click="confirmDeleteAction(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <ConfirmDialog />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import ConfirmDialog from 'primevue/confirmdialog'
import Select from 'primevue/select'
import Popover from 'primevue/popover'
import Badge from 'primevue/badge'
import { useConfirm } from 'primevue/useconfirm'
import { useSchoolOptions } from '@/composables/useSchoolOptions'
import { getClassLabel, getGpaLabel } from '@/utils/studentLabels'
import { formatCompactDate, formatCompactTime } from '@/utils/dateUtils'

const props = defineProps({
  students: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  exporting: { type: Boolean, default: false },
  pagination: { type: Object, default: null }
})

const emit = defineEmits(['page-change', 'search', 'delete', 'delete-multiple', 'sort', 'filter', 'show', 'open-import', 'export'])

const router = useRouter()
const confirm = useConfirm()
const { oldProvinces, fetchOldProvinces } = useSchoolOptions()

onMounted(() => {
  fetchOldProvinces()
})

const searchQuery = ref('')
const selectedStudents = ref([])
let searchTimeout = null

// Filters
const filterPopover = ref(null)
const activeFilters = ref({ oldProvinceId: null, birthYear: null })
const pendingFilters = ref({ oldProvinceId: null, birthYear: null })

const activeFilterCount = computed(() => {
  let count = 0
  if (activeFilters.value.oldProvinceId) count++
  if (activeFilters.value.birthYear) count++
  return count
})

const toggleFilterPopover = (event) => {
  pendingFilters.value = { ...activeFilters.value }
  filterPopover.value.toggle(event)
}

const applyFilters = () => {
  activeFilters.value = { ...pendingFilters.value }
  emit('filter', activeFilters.value)
  filterPopover.value.hide()
}

const resetFilters = () => {
  pendingFilters.value = { oldProvinceId: null, birthYear: null }
  activeFilters.value = { oldProvinceId: null, birthYear: null }
  emit('filter', activeFilters.value)
  filterPopover.value.hide()
}

const currentYear = new Date().getFullYear()
const birthYearOptions = Array.from({ length: 40 }, (_, i) => {
  const year = currentYear - i
  return { label: year.toString(), value: year }
})

const onPage = (event) => {
  const page = Math.floor(event.first / event.rows) + 1
  emit('page-change', { page, limit: event.rows })
}

const onSort = (event) => {
  emit('sort', { sortField: event.sortField, sortOrder: event.sortOrder })
}

const onSearch = (e) => {
  searchQuery.value = e.target.value
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    emit('search', searchQuery.value)
  }, 500)
}

const confirmDeleteAction = (student) => {
  confirm.require({
    message: `Are you sure you want to delete "${student.fullName}"? This action cannot be undone.`,
    header: 'Delete Student',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancel',
    rejectProps: { severity: 'secondary', text: true },
    acceptLabel: 'Delete',
    acceptProps: { severity: 'danger' },
    accept: () => {
      emit('delete', student.id)
    }
  })
}
</script>

<style scoped>
.table-container {
  background: var(--p-content-background);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--p-surface-200);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

/* Toolbars */
.primary-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem 0.5rem 1rem;
}

.toolbar-spacer {
  flex: 1;
}

.toolbar-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.search-input {
  width: 280px;
}

.secondary-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem 0.75rem 1rem;
}

.secondary-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.secondary-right {
  display: flex;
  align-items: center;
}

.filter-btn {
  position: relative;
}

.filter-badge {
  position: absolute;
  top: -8px;
  right: -8px;
}

.result-count,
.selection-count {
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
  font-weight: 500;
}

.selection-count {
  color: var(--p-primary-color);
}

.import-btn {
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
}

/* Popover */
.popover-content {
  padding: 0.5rem;
  width: 240px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.popover-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
  border-top: 1px solid var(--p-surface-200);
  padding-top: 1rem;
}

.w-full {
  width: 100%;
}

/* ===== Compact DataTable Overrides ===== */
.student-datatable :deep(.p-datatable-header) {
  padding: 0;
  background: var(--p-content-background);
  border-bottom: 1px solid var(--p-surface-200);
}

.student-datatable :deep(.p-datatable-thead > tr > th) {
  padding: 0.65rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
  background: var(--p-surface-50);
  border-bottom: 1px solid var(--p-surface-200);
  border-right: none;
  white-space: nowrap;
}

.student-datatable :deep(.p-datatable-tbody > tr > td) {
  padding: 0.55rem 0.75rem;
  font-size: 0.8125rem;
  border-bottom: 1px solid var(--p-surface-100);
  border-right: none;
  vertical-align: middle;
  line-height: 1.4;
}

.student-datatable :deep(.p-datatable-tbody > tr:hover) {
  background: var(--p-surface-50) !important;
}

.student-datatable :deep(.p-datatable-tbody > tr:nth-child(even)) {
  background: transparent;
}

/* Paginator compact */
.student-datatable :deep(.p-paginator) {
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  border-top: 1px solid var(--p-surface-200);
  justify-content: center;
}

.student-datatable :deep(.p-paginator .p-paginator-current) {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

/* Frozen column styling */
.student-datatable :deep(.p-datatable-frozen-column) {
  background: var(--p-content-background);
}

/* ===== Cell content styles ===== */
.student-name {
  font-weight: 500;
  color: var(--p-text-color);
}

.student-email {
  font-size: 0.8125rem;
  color: var(--p-primary-color);
}

.null-text {
  color: var(--p-text-muted-color);
}

.gpa-badge {
  display: inline-block;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: var(--p-primary-50);
  color: var(--p-primary-600);
  font-weight: 600;
  font-size: 0.75rem;
  white-space: nowrap;
}

.created-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.created-time {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.school-cell {
  display: inline-block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-buttons {
  display: flex;
  gap: 0;
}

.action-buttons :deep(.p-button) {
  width: 2rem;
  height: 2rem;
}

.action-buttons :deep(.p-button .p-button-icon) {
  font-size: 0.85rem;
}

/* Empty & Loading */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 1rem;
  gap: 0.5rem;
  color: var(--p-text-muted-color);
}

.empty-state i {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  opacity: 0.4;
}

.empty-state h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.empty-state p {
  margin: 0;
  font-size: 0.85rem;
}

.empty-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  gap: 0.75rem;
  color: var(--p-text-muted-color);
}

@media (max-width: 768px) {
  .search-input {
    width: 100%;
  }

  .toolbar-actions {
    width: 100%;
    flex-direction: column;
    align-items: flex-end;
  }

  .primary-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}
</style>

<template>
  <div class="table-container">
    <DataTable 
      :value="inquiries" 
      lazy 
      :paginator="true" 
      :rows="pagination?.limit || 20"
      :first="((pagination?.page || 1) - 1) * (pagination?.limit || 20)" 
      :totalRecords="pagination?.totalCount || 0"
      :rowsPerPageOptions="[10, 20, 50, 100]" 
      :loading="loading" 
      @page="onPage" 
      @sort="onSort" 
      v-model:selection="selectedInquiries" 
      dataKey="id" 
      :removableSort="true" 
      :scrollable="true"
      :scrollHeight="'calc(100vh - 200px)'" 
      class="inquiry-datatable"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
      currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
      :paginatorLeft="true" 
      :paginatorRight="true"
    >
      <template #header>
        <!-- Primary Toolbar -->
        <div class="primary-toolbar">
          <div class="toolbar-spacer">
            <IconField>
              <InputIcon class="pi pi-search" />
              <InputText 
                placeholder="Search inquiries..." 
                @input="onSearch" 
                :value="searchQuery" 
                class="search-input" 
              />
            </IconField>
          </div>
          <div class="toolbar-actions">
            <Button 
              v-if="selectedInquiries.length > 0 && $can('delete', 'inquiry')" 
              :label="`Delete (${selectedInquiries.length})`" 
              icon="pi pi-trash" 
              severity="danger" 
              text 
              @click="confirmDeleteSelected" 
              class="delete-btn" 
            />
            <Button 
              v-if="$can('import', 'inquiry')" 
              label="Sync Google Sheets" 
              icon="pi pi-sync" 
              text 
              @click="emit('sync-sheets')" 
              class="sync-sheets-btn" 
              :loading="syncing" 
            />
            <Button 
              v-if="$can('export', 'inquiry')" 
              label="Export" 
              icon="pi pi-download" 
              text
              @click="emit('export')" 
              class="export-btn" 
              :loading="exporting" 
            />
            <Button 
              v-if="$can('create', 'inquiry')" 
              label="New Inquiry" 
              icon="pi pi-plus"
              @click="router.push('/inquiries/new')" 
            />
          </div>
        </div>

        <!-- Secondary Toolbar -->
        <div class="secondary-toolbar">
          <div class="secondary-left">
            <Button 
              label="Filter" 
              icon="pi pi-filter" 
              outlined 
              @click="toggleFilterPopover" 
              class="filter-btn"
              :badge="activeFilterCount > 0 ? String(activeFilterCount) : undefined" 
              badgeSeverity="danger" 
            />

            <span v-if="selectedInquiries.length > 0" class="selection-count">
              {{ selectedInquiries.length }} Selected
            </span>

            <span v-if="selectedInquiries.length === 0" class="result-count">
              {{ pagination?.totalCount || 0 }} Results
            </span>
          </div>
        </div>

        <!-- Filter Popover -->
        <Popover ref="filterPopover" class="filter-popover">
          <div class="popover-content">
            <div class="filter-group">
              <label>Birth Year</label>
              <Select 
                v-model="pendingFilters.birthYear" 
                :options="birthYearOptions" 
                optionLabel="label"
                optionValue="value" 
                placeholder="Select..." 
                showClear 
                appendTo="self" 
                class="w-full" 
              />
            </div>
            <div class="filter-group">
              <label>School Old Province</label>
              <Select 
                v-model="pendingFilters.oldProvinceId" 
                :options="oldProvinces" 
                optionLabel="name" 
                optionValue="id"
                placeholder="Select old province..." 
                filter
                showClear 
                appendTo="self" 
                class="w-full" 
              />
            </div>
            <div class="popover-actions">
              <Button label="Reset" text severity="secondary" size="small" @click="resetFilters" />
              <Button label="Apply" size="small" @click="applyFilters" />
            </div>
          </div>
        </Popover>
      </template>

      <!-- Empty State -->
      <template #empty>
        <div class="empty-state">
          <i class="pi pi-inbox"></i>
          <h3>No inquiries found</h3>
          <p>Get started by creating a new inquiry or adjust your search and filters.</p>
          <div class="empty-actions">
            <Button 
              v-if="$can('create', 'inquiry')" 
              label="New Inquiry" 
              icon="pi pi-plus" 
              @click="router.push('/inquiries/new')" 
            />
          </div>
        </div>
      </template>

      <!-- Loading State -->
      <template #loading>
        <div class="loading-state">
          <i class="pi pi-spin pi-spinner" style="font-size: 1.5rem"></i>
          <p>Loading inquiries...</p>
        </div>
      </template>

      <!-- Multi-select Checkbox Column -->
      <Column 
        selectionMode="multiple" 
        headerStyle="width: 2.5rem" 
        bodyStyle="width: 2.5rem" 
        :exportable="false" 
      />

      <!-- Data Columns -->
      <Column field="assignedTo.fullName" header="Assigned Staff" sortable style="min-width: 160px">
        <template #body="{ data }">
          <span v-if="data.assignedTo" class="user-name">{{ data.assignedTo.fullName }}</span>
          <span v-else class="null-text">—</span>
        </template>
      </Column>

      <Column field="student.fullName" header="Student" sortable style="min-width: 160px">
        <template #body="{ data }">
          <span v-if="data.student" class="student-name">{{ data.student.fullName }}</span>
          <span v-else class="null-text">—</span>
        </template>
      </Column>

      <Column header="Interaction Status" style="min-width: 150px">
        <template #body="{ data }">
          <Tag 
            v-if="getStatusLevel(data.statusData, 'interaction') !== '—'" 
            :value="getStatusLevel(data.statusData, 'interaction')" 
            :severity="getStatusTagSeverity(getStatusLevel(data.statusData, 'interaction'))" 
            rounded 
            class="status-tag"
          />
          <span v-else class="null-text">—</span>
        </template>
      </Column>

      <Column header="General Status" style="min-width: 150px">
        <template #body="{ data }">
          <Tag 
            v-if="getStatusLevel(data.statusData, 'general') !== '—'" 
            :value="getStatusLevel(data.statusData, 'general')" 
            :severity="getStatusTagSeverity(getStatusLevel(data.statusData, 'general'))" 
            rounded 
            class="status-tag"
          />
          <span v-else class="null-text">—</span>
        </template>
      </Column>

      <Column header="Detail Status" style="min-width: 150px">
        <template #body="{ data }">
          <Tag 
            v-if="getStatusLevel(data.statusData, 'detail') !== '—'" 
            :value="getStatusLevel(data.statusData, 'detail')" 
            :severity="getStatusTagSeverity(getStatusLevel(data.statusData, 'detail'))" 
            rounded 
            class="status-tag"
          />
          <span v-else class="null-text">—</span>
        </template>
      </Column>

      <Column field="description" header="Description" sortable style="min-width: 180px">
        <template #body="{ data }">
          <span 
            v-if="data.description" 
            class="desc-cell" 
            v-tooltip.top="data.description"
          >
            {{ data.description }}
          </span>
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

      
      <!-- Actions Column -->
      <Column header="Actions" style="width: 110px" :exportable="false" frozen alignFrozen="right">
        <template #body="{ data }">
          <div class="action-buttons">
            <Button 
              v-if="canUpdate(data)" 
              icon="pi pi-pencil" 
              rounded 
              text 
              severity="info" 
              aria-label="Edit Inquiry" 
              v-tooltip.top="'Edit Inquiry'"
              @click="onEdit(data.id)" 
            />
            <Button 
              v-if="canDelete(data)" 
              icon="pi pi-trash" 
              rounded 
              text 
              severity="danger" 
              aria-label="Delete Inquiry" 
              v-tooltip.top="'Delete Inquiry'"
              @click="confirmDeleteAction(data)" 
            />
            <span v-if="!canUpdate(data) && !canDelete(data)" class="null-text">—</span>
          </div>
        </template>
      </Column>
      <!-- View Detail Column -->
      <Column header="View Detail" style="width: 100px; text-align: center" :exportable="false">
        <template #body="{ data }">
          <Button 
            v-if="canRead(data)" 
            icon="pi pi-eye" 
            rounded 
            text 
            severity="info" 
            aria-label="View Inquiry Details" 
            v-tooltip.top="'View Details'"
            @click="emit('show', data.id)" 
          />
          <span v-else class="null-text">—</span>
        </template>
      </Column>
    </DataTable>

    <!-- Confirmation Dialog -->
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
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import { useSchoolOptions } from '@/composables/useSchoolOptions'
import { getStatusLevel } from '@/utils/inquiryLabels'
import { formatCompactDate, formatCompactTime } from '@/utils/dateUtils'
import { canPerform } from '@/services/ability'

defineProps({
  inquiries: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  exporting: { type: Boolean, default: false },
  syncing: { type: Boolean, default: false },
  pagination: { type: Object, default: null }
})

const emit = defineEmits([
  'page-change', 
  'search', 
  'delete', 
  'delete-selected', 
  'show', 
  'edit',
  'export', 
  'sync-sheets',
  'filter', 
  'sort'
])

const router = useRouter()
const confirm = useConfirm()

const canRead = (inquiry) => canPerform('read', 'inquiry', inquiry)
const canUpdate = (inquiry) => canPerform('update', 'inquiry', inquiry)
const canDelete = (inquiry) => canPerform('delete', 'inquiry', inquiry)

const onEdit = (id) => {
  emit('edit', id)
  router.push(`/inquiries/${id}`)
}

const selectedInquiries = ref([])
const searchQuery = ref('')
let searchTimeout = null

const { oldProvinces, fetchOldProvinces } = useSchoolOptions()

onMounted(() => {
  fetchOldProvinces()
})

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
  }, 400)
}

// Single delete confirmation
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

// Bulk delete confirmation
const confirmDeleteSelected = () => {
  if (!selectedInquiries.value || selectedInquiries.value.length === 0) return

  const count = selectedInquiries.value.length
  confirm.require({
    message: `Are you sure you want to delete ${count} selected ${count === 1 ? 'inquiry' : 'inquiries'}? Student records will be preserved.`,
    header: 'Delete Selected Inquiries',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancel',
    rejectProps: { severity: 'secondary', text: true },
    acceptLabel: 'Delete',
    acceptProps: { severity: 'danger' },
    accept: () => {
      const idsToDelete = selectedInquiries.value.map(item => item.id)
      emit('delete-selected', idsToDelete)
      selectedInquiries.value = []
    }
  })
}

// Dynamic semantic color mapping for status tags
const getStatusTagSeverity = (label) => {
  if (!label || label === '—') return 'secondary'
  const text = label.toLowerCase()
  if (text.includes('nộp hồ sơ') || text.includes('nộp phí') || text.includes('nhập học') || text.includes('thành công')) {
    return 'success'
  }
  if (text.includes('tương tác') || text.includes('quan tâm') || text.includes('hẹn')) {
    return 'info'
  }
  if (text.includes('cân nhắc') || text.includes('tương lai') || text.includes('chưa xử lý') || text.includes('chờ')) {
    return 'warn'
  }
  if (text.includes('sai') || text.includes('hủy') || text.includes('từ chối') || text.includes('không')) {
    return 'danger'
  }
  return 'secondary'
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

.filter-btn {
  position: relative;
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

.export-btn,
.delete-btn,
.sync-sheets-btn {
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

/* ===== Compact DataTable Overrides matching StudentList ===== */
.inquiry-datatable :deep(.p-datatable-header) {
  padding: 0;
  background: var(--p-content-background);
  border-bottom: 1px solid var(--p-surface-200);
}

.inquiry-datatable :deep(.p-datatable-thead > tr > th) {
  padding: 0.65rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
  background: var(--p-surface-50);
  border-bottom: 1px solid var(--p-surface-200);
  border-right: none;
  white-space: nowrap;
}

.inquiry-datatable :deep(.p-datatable-tbody > tr > td) {
  padding: 0.55rem 0.75rem;
  font-size: 0.8125rem;
  border-bottom: 1px solid var(--p-surface-100);
  border-right: none;
  vertical-align: middle;
  line-height: 1.4;
}

.inquiry-datatable :deep(.p-datatable-tbody > tr:hover) {
  background: var(--p-surface-50) !important;
}

.inquiry-datatable :deep(.p-datatable-tbody > tr:nth-child(even)) {
  background: transparent;
}

/* Paginator compact */
.inquiry-datatable :deep(.p-paginator) {
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  border-top: 1px solid var(--p-surface-200);
  justify-content: center;
}

.inquiry-datatable :deep(.p-paginator .p-paginator-current) {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

/* Frozen column styling */
.inquiry-datatable :deep(.p-datatable-frozen-column) {
  background: var(--p-content-background);
}

/* ===== Cell content styles ===== */
.user-name,
.student-name {
  font-weight: 500;
  color: var(--p-text-color);
}

.null-text {
  color: var(--p-text-muted-color);
}

.desc-cell {
  display: inline-block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-tag {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.1rem 0.45rem;
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

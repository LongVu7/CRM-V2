<template>
  <div class="table-card-wrapper">
    <!-- Top Action Toolbar (Freya Crud pattern) -->
    <Toolbar class="table-action-toolbar">
      <template #start>
        <div class="toolbar-start">
          <Button 
            v-if="$can('create', 'inquiry')" 
            label="New" 
            icon="pi pi-plus" 
            severity="primary" 
            class="action-btn-new"
            @click="router.push('/inquiries/new')" 
          />
          <Button 
            v-if="$can('delete', 'inquiry')" 
            :label="selectedInquiries.length > 0 ? `Delete (${selectedInquiries.length})` : 'Delete'" 
            icon="pi pi-trash" 
            severity="danger" 
            outlined 
            :disabled="!selectedInquiries || selectedInquiries.length === 0" 
            class="action-btn-delete"
            @click="confirmDeleteSelected" 
          />
        </div>
      </template>

      <template #end>
        <Button 
          v-if="$can('export', 'inquiry')" 
          label="Export" 
          icon="pi pi-download" 
          severity="secondary" 
          outlined 
          class="action-btn-export"
          :loading="exporting" 
          @click="emit('export')" 
        />
      </template>
    </Toolbar>

    <!-- Data Table Container -->
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
        removableSort 
        stripedRows
        showGridlines
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} inquiries"
        class="inquiry-datatable"
      >
        <!-- Table Sub-header (Search + Filter + Title) -->
        <template #header>
          <div class="table-sub-header">
            <div class="header-title-section">
              <h2 class="table-heading">Manage Inquiries</h2>
              <div v-if="selectedInquiries.length > 0" class="selection-pill">
                <Badge :value="selectedInquiries.length" severity="info" />
                <span class="selection-msg">{{ selectedInquiries.length }} selected</span>
                <Button label="Clear" text size="small" class="clear-btn" @click="selectedInquiries = []" />
              </div>
              <span v-else class="total-count-text">
                {{ pagination?.totalCount || 0 }} total inquiries
              </span>
            </div>

            <div class="header-controls-section">
              <Button 
                label="Filter" 
                icon="pi pi-filter" 
                outlined 
                severity="secondary"
                @click="toggleFilterPopover" 
                class="filter-btn"
                :badge="activeFilterCount > 0 ? String(activeFilterCount) : undefined" 
                badgeSeverity="danger" 
              />
              <IconField>
                <InputIcon class="pi pi-search" />
                <InputText 
                  placeholder="Search inquiries (desc, student)..." 
                  @input="onSearch" 
                  :value="searchQuery"
                  class="search-input" 
                />
              </IconField>
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
            <i class="pi pi-inbox empty-icon"></i>
            <h3>No inquiries found</h3>
            <p>Create a new inquiry or adjust your search and filters to get started.</p>
            <Button 
              v-if="$can('create', 'inquiry')" 
              label="New Inquiry" 
              icon="pi pi-plus" 
              severity="primary" 
              @click="router.push('/inquiries/new')" 
            />
          </div>
        </template>

        <!-- Multi-select Checkbox Column -->
        <Column 
          selectionMode="multiple" 
          headerStyle="width: 3.5rem; text-align: center" 
          bodyStyle="text-align: center" 
          :exportable="false" 
        />

        <!-- Data Columns -->
        <Column field="assignedTo.fullName" header="Assigned Account" sortable style="min-width: 170px">
          <template #body="{ data }">
            <div v-if="data.assignedTo" class="user-cell">
              <i class="pi pi-user user-icon"></i>
              <span class="user-name">{{ data.assignedTo.fullName }}</span>
            </div>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column field="student.fullName" header="Student" sortable style="min-width: 160px">
          <template #body="{ data }">
            <div v-if="data.student" class="student-cell">
              <i class="pi pi-id-card student-icon"></i>
              <span class="student-name">{{ data.student.fullName }}</span>
            </div>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column header="Interaction Status" style="min-width: 160px">
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

        <Column header="General Status" style="min-width: 160px">
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

        <Column header="Detail Status" style="min-width: 160px">
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

        <Column field="description" header="Description" sortable style="min-width: 220px">
          <template #body="{ data }">
            <span 
              v-if="data.description" 
              class="desc-text" 
              v-tooltip.top="data.description.length > 50 ? data.description : undefined"
            >
              {{ data.description.length > 50 ? data.description.substring(0, 50) + '...' : data.description }}
            </span>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column field="createdAt" header="Created" sortable style="width: 140px">
          <template #body="{ data }">
            <span class="date-text">{{ formatCompactDate(data.createdAt) }}</span>
          </template>
        </Column>

        <!-- Actions Column -->
        <Column header="Actions" style="width: 130px; text-align: center" bodyStyle="text-align: center" :exportable="false" frozen alignFrozen="right">
          <template #body="{ data }">
            <div class="action-buttons">
              <Button 
                icon="pi pi-eye" 
                rounded 
                text 
                severity="info" 
                size="small" 
                v-tooltip.top="'View Details'"
                @click="emit('show', data.id)" 
              />
              <Button 
                v-if="$can('update', 'inquiry')" 
                icon="pi pi-pencil" 
                rounded 
                text 
                severity="secondary" 
                size="small" 
                v-tooltip.top="'Edit Inquiry'"
                @click="router.push(`/inquiries/${data.id}`)" 
              />
              <Button 
                v-if="$can('delete', 'inquiry')" 
                icon="pi pi-trash" 
                rounded 
                text 
                severity="danger" 
                size="small" 
                v-tooltip.top="'Delete Inquiry'"
                @click="confirmDeleteAction(data)" 
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Confirmation Dialog -->
    <ConfirmDialog />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Toolbar from 'primevue/toolbar'
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
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import { useSchoolOptions } from '@/composables/useSchoolOptions'
import { getStatusLevel } from '@/utils/inquiryLabels'
import { formatCompactDate } from '@/utils/dateUtils'

defineProps({
  inquiries: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  exporting: { type: Boolean, default: false },
  pagination: { type: Object, default: null }
})

const emit = defineEmits([
  'page-change', 
  'search', 
  'delete', 
  'delete-selected', 
  'show', 
  'export', 
  'filter', 
  'sort'
])

const router = useRouter()
const confirm = useConfirm()

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
/* Card Wrapper matching Freya design */
.table-card-wrapper {
  background: var(--p-content-background);
  border-radius: 14px;
  border: 1px solid var(--p-surface-200);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Freya Top Toolbar */
.table-action-toolbar {
  background: transparent;
  border: none;
  padding: 0;
}

.toolbar-start {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.action-btn-new {
  font-weight: 600;
  padding: 0.55rem 1.15rem;
  border-radius: 8px;
}

.action-btn-delete {
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.action-btn-export {
  font-weight: 500;
  border-radius: 8px;
  padding: 0.55rem 1.15rem;
}

/* DataTable Wrapper */
.table-container {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--p-surface-200);
}

/* Table Sub-header (Search + Filter + Title) */
.table-sub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.5rem 0.25rem;
}

.header-title-section {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.table-heading {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--p-text-color);
  margin: 0;
  letter-spacing: -0.01em;
}

.selection-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--p-surface-100);
  border: 1px solid var(--p-surface-200);
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
}

.selection-msg {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.clear-btn {
  padding: 0 0.25rem;
  font-size: 0.8rem;
  color: var(--p-primary-color);
}

.total-count-text {
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
  font-weight: 500;
}

.header-controls-section {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.search-input {
  width: 280px;
}

/* Cell typography & icons */
.user-cell,
.student-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-icon,
.student-icon {
  font-size: 0.9rem;
  color: var(--p-text-muted-color);
  opacity: 0.75;
}

.user-name,
.student-name {
  font-weight: 500;
  color: var(--p-text-color);
}

.null-text {
  color: var(--p-text-muted-color);
  opacity: 0.6;
}

.desc-text {
  font-size: 0.88rem;
  color: var(--p-text-color);
  display: inline-block;
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: default;
}

.date-text {
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.status-tag {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.2rem 0.65rem;
}

.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

/* Filter Popover */
.popover-content {
  padding: 1.15rem;
  width: 270px;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.filter-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.popover-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3.5rem 1.5rem;
  gap: 0.6rem;
  color: var(--p-text-muted-color);
  text-align: center;
}

.empty-icon {
  font-size: 3.25rem;
  margin-bottom: 0.5rem;
  opacity: 0.35;
  color: var(--p-primary-color);
}

.empty-state h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.empty-state p {
  margin: 0 0 1.25rem 0;
  font-size: 0.92rem;
  max-width: 320px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .table-card-wrapper {
    padding: 0.85rem;
  }
  
  .table-sub-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-controls-section {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-input {
    width: 100%;
  }
}
</style>

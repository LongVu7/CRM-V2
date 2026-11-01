<template>
  <div class="lead-list-view">
    <!-- Top Breadcrumb & Title Row -->
    <div class="page-header">
      <div class="header-left">
        <div class="breadcrumb-bar">
          <span class="breadcrumb-muted">Pages</span>
          <i class="pi pi-angle-right breadcrumb-separator"></i>
          <span class="breadcrumb-active">Lead Management</span>
        </div>
        <div class="title-row">
          <h1><i class="pi pi-ticket"></i> Lead Management</h1>
          <Tag :value="`${pagination?.totalCount || 0} leads`" severity="info" rounded class="count-tag" />
        </div>
      </div>

      <!-- Header Actions: Quick link to Dedicated Lead Distribution View -->
      <div class="header-actions">
        <Button
          v-if="$can('distribute', 'lead')"
          label="Distribute Leads (Unassigned Pool)"
          icon="pi pi-share-alt"
          severity="warn"
          class="distribution-nav-btn"
          @click="router.push('/leads/distribution')"
        />
      </div>
    </div>

    <!-- Main Lead Table Container -->
    <div class="table-container">
      <DataTable 
        :value="leads" 
        lazy 
        :paginator="true" 
        :rows="pagination?.limit || 20"
        :first="((pagination?.page || 1) - 1) * (pagination?.limit || 20)" 
        :totalRecords="pagination?.totalCount || 0"
        :rowsPerPageOptions="[10, 20, 50, 100]" 
        :loading="loading" 
        @page="handlePage" 
        @sort="handleSort" 
        v-model:selection="selectedLeads" 
        dataKey="id" 
        :removableSort="true" 
        :scrollable="true"
        :scrollHeight="'calc(100vh - 200px)'" 
        class="lead-datatable"
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
                  placeholder="Search leads..." 
                  @input="handleSearchInput" 
                  :value="searchQuery" 
                  class="search-input" 
                />
              </IconField>
            </div>
            <div class="toolbar-actions">
              <Button 
                v-if="selectedLeads.length > 0 && $can('delete', 'lead')" 
                :label="`Delete (${selectedLeads.length})`" 
                icon="pi pi-trash" 
                severity="danger" 
                text 
                @click="confirmDeleteSelected" 
                class="delete-btn" 
              />
              <Button 
                v-if="$can('import', 'lead')" 
                label="Sync Google Sheets" 
                icon="pi pi-sync" 
                text 
                @click="onSyncSheets" 
                class="sync-sheets-btn" 
                :loading="syncing" 
              />
              <Button 
                v-if="$can('import', 'lead')" 
                label="Import Excel" 
                icon="pi pi-file-excel" 
                text 
                @click="router.push('/leads/import')" 
                class="import-btn" 
              />
              <Button 
                v-if="$can('export', 'lead')" 
                label="Export" 
                icon="pi pi-download" 
                text
                @click="onExport" 
                class="export-btn" 
                :loading="exporting" 
              />
              <Button 
                v-if="$can('create', 'lead')" 
                label="New Lead" 
                icon="pi pi-plus"
                @click="router.push('/leads/new')" 
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

              <span v-if="selectedLeads.length > 0" class="selection-count">
                {{ selectedLeads.length }} Selected
              </span>

              <span v-if="selectedLeads.length === 0" class="result-count">
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
            <h3>No leads found</h3>
            <p>Get started by creating a new lead or adjust your search and filters.</p>
            <div class="empty-actions">
              <Button 
                v-if="$can('create', 'lead')" 
                label="New Lead" 
                icon="pi pi-plus" 
                @click="router.push('/leads/new')" 
              />
            </div>
          </div>
        </template>

        <!-- Loading State -->
        <template #loading>
          <div class="loading-state">
            <i class="pi pi-spin pi-spinner" style="font-size: 1.5rem"></i>
            <p>Loading leads...</p>
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

        <Column field="student.fullName" header="Full Name" sortable style="min-width: 160px">
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
                aria-label="Edit Lead" 
                v-tooltip.top="'Edit Lead'"
                @click="router.push(`/leads/${data.id}`)" 
              />
              <Button 
                v-if="canDelete(data)" 
                icon="pi pi-trash" 
                rounded 
                text 
                severity="danger" 
                aria-label="Delete Lead" 
                v-tooltip.top="'Delete Lead'"
                @click="confirmDeleteAction(data)" 
              />
              <span v-if="!canUpdate(data) && !canDelete(data)" class="null-text">—</span>
            </div>
          </template>
        </Column>

        <!-- View Detail Column -->
        <Column header="View Detail" style="width: 120px; text-align: center" :exportable="false">
          <template #body="{ data }">
            <div class="action-buttons" style="justify-content: center;">
              <Button 
                v-if="canRead(data)" 
                icon="pi pi-history" 
                rounded 
                text 
                severity="secondary" 
                aria-label="Status Transition History" 
                v-tooltip.top="'Status Transition History'"
                @click="openStatusHistory(data.id)" 
              />
              <Button 
                v-if="canRead(data)" 
                icon="pi pi-eye" 
                rounded 
                text 
                severity="info" 
                aria-label="View Lead Details" 
                v-tooltip.top="'View Details'"
                @click="onShow(data.id)" 
              />
              <span v-if="!canRead(data)" class="null-text">—</span>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Confirmation Dialog -->
    <ConfirmDialog />

    <!-- Status Transition History Dialog -->
    <LeadStatusHistoryDialog
      v-model:visible="statusHistoryDialogVisible"
      :leadId="selectedLeadIdForHistory"
    />

    <!-- Lead Details Dialog -->
    <LeadShowDialog
      v-model:visible="showDialogVisible"
      :leadId="showDialogLeadId"
    />
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
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

import LeadShowDialog from '@/components/lead/LeadShowDialog.vue'
import LeadStatusHistoryDialog from '@/components/lead/LeadStatusHistoryDialog.vue'

import { useLead } from '@/composables/useLead'
import { useTableQuery } from '@/composables/useTableQuery'
import { useSchoolOptions } from '@/composables/useSchoolOptions'
import { exportLeads, syncGoogleSheets } from '@/services/leadService'
import { canPerform } from '@/services/ability'
import { getStatusLevel, getStatusTagSeverity } from '@/utils/leadLabels'
import { formatCompactDate, formatCompactTime } from '@/utils/dateUtils'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const { leads, pagination, loading, fetchLeads, deleteLead, deleteLeads } = useLead()

const { currentParams, loadData, onPageChange, onSort, onSearch, onFilter } = useTableQuery(
  async (params) => {
    try {
      await fetchLeads(params)
    } catch {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load leads', life: 5000 })
    }
  }
)

// Table selection & search
const selectedLeads = ref([])
const searchQuery = ref('')
let searchTimeout = null

const handleSearchInput = (e) => {
  searchQuery.value = e.target.value
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    onSearch(searchQuery.value)
  }, 400)
}

const handlePage = (event) => {
  const page = Math.floor(event.first / event.rows) + 1
  onPageChange({ page, limit: event.rows })
}

const handleSort = (event) => {
  onSort({ sortField: event.sortField, sortOrder: event.sortOrder })
}

// Filter Popover
const { oldProvinces, fetchOldProvinces } = useSchoolOptions()
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
  onFilter(activeFilters.value)
  filterPopover.value.hide()
}

const resetFilters = () => {
  pendingFilters.value = { oldProvinceId: null, birthYear: null }
  activeFilters.value = { oldProvinceId: null, birthYear: null }
  onFilter(activeFilters.value)
  filterPopover.value.hide()
}

const currentYear = new Date().getFullYear()
const birthYearOptions = Array.from({ length: 40 }, (_, i) => {
  const year = currentYear - i
  return { label: year.toString(), value: year }
})

// Permissions
const canRead = (lead) => canPerform('read', 'lead', lead)
const canUpdate = (lead) => canPerform('update', 'lead', lead)
const canDelete = (lead) => canPerform('delete', 'lead', lead)

// Dialog states & actions
const showDialogVisible = ref(false)
const showDialogLeadId = ref(null)
const statusHistoryDialogVisible = ref(false)
const selectedLeadIdForHistory = ref(null)
const exporting = ref(false)
const syncing = ref(false)

const onShow = (leadId) => {
  showDialogLeadId.value = leadId
  showDialogVisible.value = true
}

const openStatusHistory = (id) => {
  selectedLeadIdForHistory.value = id
  statusHistoryDialogVisible.value = true
}

// Single delete confirmation
const confirmDeleteAction = (lead) => {
  confirm.require({
    message: `Are you sure you want to delete lead #${lead.id}? Student records will be preserved.`,
    header: 'Delete Lead',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancel',
    rejectProps: { severity: 'secondary', text: true },
    acceptLabel: 'Delete',
    acceptProps: { severity: 'danger' },
    accept: async () => {
      try {
        await deleteLead(lead.id)
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'Lead deleted successfully', life: 3000 })
        await loadData()
      } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete lead', life: 5000 })
      }
    }
  })
}

// Bulk delete confirmation
const confirmDeleteSelected = () => {
  if (!selectedLeads.value || selectedLeads.value.length === 0) return

  const count = selectedLeads.value.length
  confirm.require({
    message: `Are you sure you want to delete ${count} selected ${count === 1 ? 'lead' : 'leads'}? Student records will be preserved.`,
    header: 'Delete Selected Leads',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancel',
    rejectProps: { severity: 'secondary', text: true },
    acceptLabel: 'Delete',
    acceptProps: { severity: 'danger' },
    accept: async () => {
      const idsToDelete = selectedLeads.value.map(item => item.id)
      try {
        await deleteLeads(idsToDelete)
        toast.add({ 
          severity: 'success', 
          summary: 'Deleted', 
          detail: `Successfully deleted ${count} ${count === 1 ? 'lead' : 'leads'}`, 
          life: 3000 
        })
        selectedLeads.value = []
        await loadData()
      } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete selected leads', life: 5000 })
      }
    }
  })
}

const onExport = async () => {
  if (exporting.value) return
  exporting.value = true
  try {
    const data = await exportLeads(currentParams.value)
    const url = window.URL.createObjectURL(new Blob([data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `leads-${new Date().toISOString().split('T')[0]}.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    toast.add({ severity: 'success', summary: 'Success', detail: 'Export downloaded successfully', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to export leads', life: 5000 })
  } finally {
    exporting.value = false
  }
}

const onSyncSheets = async () => {
  if (syncing.value) return
  syncing.value = true
  try {
    const res = await syncGoogleSheets()
    toast.add({
      severity: 'success',
      summary: 'Google Sheets Sync',
      detail: res?.message || 'Google Sheets sync completed successfully.',
      life: 5000
    })
    await loadData()
  } catch (error) {
    const errorMsg = error?.response?.data?.message || 'Failed to sync Google Sheets'
    toast.add({
      severity: 'error',
      summary: 'Sync Failed',
      detail: errorMsg,
      life: 5000
    })
  } finally {
    syncing.value = false
  }
}

onMounted(() => {
  loadData()
  fetchOldProvinces()
})
</script>

<style scoped>
.lead-list-view {
  padding: 1.5rem 2rem;
  max-width: 100%;
}

.page-header {
  margin-bottom: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.breadcrumb-bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.breadcrumb-separator {
  font-size: 0.75rem;
  opacity: 0.6;
}

.breadcrumb-active {
  color: var(--p-text-color);
  font-weight: 500;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.title-row h1 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--p-text-color);
  letter-spacing: -0.01em;
}

.title-row h1 i {
  color: var(--p-primary-color);
}

.count-tag {
  font-weight: 600;
  font-size: 0.8rem;
  padding: 0.2rem 0.6rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.distribution-nav-btn {
  font-weight: 700;
}

/* Table Container */
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
.import-btn,
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

/* Compact DataTable Overrides */
.lead-datatable :deep(.p-datatable-header) {
  padding: 0;
  background: var(--p-content-background);
  border-bottom: 1px solid var(--p-surface-200);
}

.lead-datatable :deep(.p-datatable-thead > tr > th) {
  padding: 0.65rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
  background: var(--p-surface-50);
  border-bottom: 1px solid var(--p-surface-200);
  border-right: none;
  white-space: nowrap;
}

.lead-datatable :deep(.p-datatable-tbody > tr > td) {
  padding: 0.55rem 0.75rem;
  font-size: 0.8125rem;
  border-bottom: 1px solid var(--p-surface-100);
  border-right: none;
  vertical-align: middle;
  line-height: 1.4;
}

.lead-datatable :deep(.p-datatable-tbody > tr:hover) {
  background: var(--p-surface-50) !important;
}

.lead-datatable :deep(.p-datatable-tbody > tr:nth-child(even)) {
  background: transparent;
}

/* Paginator compact */
.lead-datatable :deep(.p-paginator) {
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  border-top: 1px solid var(--p-surface-200);
  justify-content: center;
}

.lead-datatable :deep(.p-paginator .p-paginator-current) {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

/* Frozen column styling */
.lead-datatable :deep(.p-datatable-frozen-column) {
  background: var(--p-content-background);
}

/* Cell content styles */
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
  .lead-list-view {
    padding: 1rem;
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .header-actions {
    width: 100%;
  }
  .distribution-nav-btn {
    width: 100%;
  }
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

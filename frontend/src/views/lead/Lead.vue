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
        :metaKeySelection="false"
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

              <!-- Column Toggle MultiSelect -->
              <MultiSelect
                v-model="visibleColumns"
                :options="ALL_COLUMNS"
                optionLabel="header"
                optionValue="field"
                placeholder="Columns"
                :maxSelectedLabels="0"
                selectedItemsLabel="{0} cols"
                class="columns-multiselect"
                filter
              >
                <template #value>
                  <div class="columns-value">
                    <i class="pi pi-table"></i>
                    <span>Columns ({{ visibleColumns.length }})</span>
                  </div>
                </template>
                <template #footer>
                  <div class="columns-dropdown-footer">
                    <Button 
                      label="Reset to Default" 
                      icon="pi pi-refresh" 
                      size="small" 
                      severity="secondary" 
                      text 
                      class="w-full"
                      @click="resetDefaultColumns" 
                    />
                  </div>
                </template>
              </MultiSelect>

              <Button
                v-if="!isDefaultColumns"
                icon="pi pi-refresh"
                text
                rounded
                severity="secondary"
                size="small"
                v-tooltip.top="'Reset default columns'"
                @click="resetDefaultColumns"
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

        <!-- Toggleable Columns -->
        <Column v-if="isColVisible('assignedTo')" field="assignedTo.fullName" header="Assigned Staff" sortable style="min-width: 160px">
          <template #body="{ data }">
            <span v-if="data.assignedTo" class="user-name">{{ data.assignedTo.fullName }}</span>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column v-if="isColVisible('fullName')" field="student.fullName" header="Full Name" sortable style="min-width: 160px">
          <template #body="{ data }">
            <span v-if="data.student" class="student-name">{{ data.student.fullName }}</span>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column v-if="isColVisible('mobile')" header="Mobile" style="min-width: 130px">
          <template #body="{ data }">
            <a v-if="data.student?.mobile || data.mobile" :href="`tel:${data.student?.mobile || data.mobile}`" class="phone-link" @click.stop>
              <i class="pi pi-phone text-xs"></i> {{ data.student?.mobile || data.mobile }}
            </a>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column v-if="isColVisible('email')" header="Email" style="min-width: 160px">
          <template #body="{ data }">
            <span v-if="data.student?.email || data.email" class="text-sm">{{ data.student?.email || data.email }}</span>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column v-if="isColVisible('birthDate')" header="Birth Date" style="min-width: 110px">
          <template #body="{ data }">
            <span v-if="data.student?.birthDate || data.birthDate">{{ formatDate(data.student?.birthDate || data.birthDate) }}</span>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column v-if="isColVisible('gender')" header="Gender" style="min-width: 100px">
          <template #body="{ data }">
            <span v-if="data.student?.gender || data.gender">{{ data.student?.gender || data.gender }}</span>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column v-if="isColVisible('schoolProvince')" header="School & Province" style="min-width: 180px">
          <template #body="{ data }">
            <div v-if="data.student?.education?.school || data.student?.education?.oldProvince" class="school-cell">
              <span class="school-name" :title="data.student?.education?.school?.name">{{ data.student?.education?.school?.name || '—' }}</span>
              <span v-if="data.student?.education?.oldProvince?.name || data.student?.education?.school?.oldProvince?.name" class="province-badge">
                {{ data.student?.education?.oldProvince?.name || data.student?.education?.school?.oldProvince?.name }}
              </span>
            </div>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column v-if="isColVisible('interestedMajor')" header="Interested Major" style="min-width: 160px">
          <template #body="{ data }">
            <span v-if="data.student?.specializedRegister?.interestedMajor" class="major-text">
              {{ data.student.specializedRegister.interestedMajor.label || data.student.specializedRegister.interestedMajor.name }}
            </span>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column v-if="isColVisible('specificMajor')" header="Specific Major" style="min-width: 160px">
          <template #body="{ data }">
            <span v-if="data.student?.specializedRegister?.specificMajor" class="major-text">
              {{ data.student.specializedRegister.specificMajor.label || data.student.specializedRegister.specificMajor.name }}
            </span>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column v-if="isColVisible('admissionYear')" header="Admission Year" style="min-width: 120px">
          <template #body="{ data }">
            <span>{{ data.student?.specializedRegister?.admissionYear || '—' }}</span>
          </template>
        </Column>

        <Column v-if="isColVisible('source')" header="Source" style="min-width: 120px">
          <template #body="{ data }">
            <Tag 
              v-if="getSourceLevel(data.sourceData, 'source') !== '—'" 
              :value="getSourceLevel(data.sourceData, 'source')" 
              :severity="getSourceSeverity(data.sourceData)" 
              :icon="getSourceIcon(data.sourceData)"
              rounded 
              class="status-tag"
            />
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column v-if="isColVisible('interactionStatus')" header="Interaction Status" style="min-width: 150px">
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

        <Column v-if="isColVisible('generalStatus')" header="General Status" style="min-width: 150px">
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

        <Column v-if="isColVisible('detailStatus')" header="Detail Status" style="min-width: 150px">
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

        <Column v-if="isColVisible('description')" field="description" header="Description" sortable style="min-width: 180px">
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

        <Column v-if="isColVisible('createdBy')" header="Created By" style="min-width: 150px">
          <template #body="{ data }">
            <span v-if="data.createdBy" class="user-name">{{ data.createdBy.fullName }}</span>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column v-if="isColVisible('createdAt')" field="createdAt" header="Created" sortable style="width: 110px">
          <template #body="{ data }">
            <div class="created-cell">
              <span>{{ formatCompactDate(data.createdAt) }}</span>
              <span class="created-time">{{ formatCompactTime(data.createdAt) }}</span>
            </div>
          </template>
        </Column>

        <!-- Unified Floating Row Actions Column -->
        <Column header="" style="width: 50px; text-align: center" :exportable="false" frozen alignFrozen="right">
          <template #body="{ data }">
            <div class="row-actions-wrapper" @click.stop>
              <Button 
                icon="pi pi-ellipsis-v" 
                rounded 
                text 
                severity="secondary" 
                size="small" 
                class="row-actions-trigger" 
              />
              <div class="row-floating-actions">
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
              </div>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Floating Bulk Action Dock when leads are selected -->
    <transition name="dock-slide">
      <div v-if="selectedLeads.length > 0" class="floating-bulk-dock">
        <div class="dock-badge">
          <i class="pi pi-check-circle"></i>
          <span>Selected <strong>{{ selectedLeads.length }}</strong> {{ selectedLeads.length === 1 ? 'lead' : 'leads' }}</span>
        </div>
        <div class="dock-divider"></div>
        <div class="dock-actions">
          <Button 
            v-if="$can('delete', 'lead')" 
            :label="`Delete (${selectedLeads.length})`" 
            icon="pi pi-trash" 
            severity="danger" 
            size="small" 
            @click="confirmDeleteSelected" 
          />
          <Button 
            icon="pi pi-times" 
            text 
            rounded 
            severity="secondary" 
            size="small" 
            v-tooltip.top="'Clear selection'" 
            @click="selectedLeads = []" 
          />
        </div>
      </div>
    </transition>

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
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import ConfirmDialog from 'primevue/confirmdialog'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
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
import { getStatusLevel, getStatusTagSeverity, getSourceLevel } from '@/utils/leadLabels'
import { formatCompactDate, formatCompactTime, formatDate } from '@/utils/dateUtils'

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

// ─── Column Toggle Config ───
const DEFAULT_COLUMNS = [
  'assignedTo',
  'fullName',
  'mobile',
  'schoolProvince',
  'interestedMajor',
  'source',
  'interactionStatus',
  'generalStatus',
  'detailStatus',
  'description',
  'createdAt'
]

const ALL_COLUMNS = [
  { field: 'assignedTo', header: 'Assigned Staff' },
  { field: 'fullName', header: 'Full Name' },
  { field: 'mobile', header: 'Mobile' },
  { field: 'email', header: 'Email' },
  { field: 'birthDate', header: 'Birth Date' },
  { field: 'gender', header: 'Gender' },
  { field: 'schoolProvince', header: 'School & Province' },
  { field: 'interestedMajor', header: 'Interested Major' },
  { field: 'specificMajor', header: 'Specific Major' },
  { field: 'admissionYear', header: 'Admission Year' },
  { field: 'source', header: 'Source' },
  { field: 'interactionStatus', header: 'Interaction Status' },
  { field: 'generalStatus', header: 'General Status' },
  { field: 'detailStatus', header: 'Detail Status' },
  { field: 'description', header: 'Description' },
  { field: 'createdBy', header: 'Created By' },
  { field: 'createdAt', header: 'Created Date' }
]

const loadSavedColumns = () => {
  try {
    const saved = localStorage.getItem('lead_table_visible_columns')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validFields = ALL_COLUMNS.map(c => c.field)
        const filtered = parsed.filter(f => validFields.includes(f))
        if (filtered.length > 0) return filtered
      }
    }
  } catch {}
  return [...DEFAULT_COLUMNS]
}

const visibleColumns = ref(loadSavedColumns())

watch(visibleColumns, (newCols) => {
  try {
    localStorage.setItem('lead_table_visible_columns', JSON.stringify(newCols))
  } catch {}
}, { deep: true })

const isColVisible = (key) => visibleColumns.value.includes(key)

const isDefaultColumns = computed(() => {
  if (visibleColumns.value.length !== DEFAULT_COLUMNS.length) return false
  return DEFAULT_COLUMNS.every(col => visibleColumns.value.includes(col))
})

const resetDefaultColumns = () => {
  visibleColumns.value = [...DEFAULT_COLUMNS]
}

const getSourceType = (sourceData) => {
  const source = getSourceLevel(sourceData, 'source')
  return source ? source.toLowerCase() : ''
}

const getSourceSeverity = (sourceData) => {
  const type = getSourceType(sourceData)
  if (type === 'online') return 'success'
  if (type === 'offline') return 'secondary'
  return 'secondary'
}

const getSourceIcon = (sourceData) => {
  const type = getSourceType(sourceData)
  if (type === 'online') return 'pi pi-globe'
  if (type === 'offline') return 'pi pi-map-marker'
  return 'pi pi-tag'
}

// ─── Table selection & search ───
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

// ─── Filter Popover ───
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
  gap: 0.75rem;
}

.filter-btn {
  position: relative;
}

.columns-multiselect {
  width: 145px;
}

.columns-multiselect :deep(.p-multiselect-label) {
  padding: 0.35rem 0.5rem;
  font-size: 0.8125rem;
}

.columns-dropdown-footer {
  padding: 0.4rem 0.5rem;
  border-top: 1px solid var(--p-surface-200);
  display: flex;
}

.columns-value {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.columns-value i {
  color: var(--p-primary-color);
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

.phone-link {
  color: var(--p-primary-color);
  text-decoration: none;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
}

.phone-link:hover {
  text-decoration: underline;
}

.school-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.school-name {
  font-weight: 500;
  color: var(--p-text-color);
  font-size: 0.8125rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.province-badge {
  font-size: 0.72rem;
  color: var(--p-text-muted-color);
}

.major-text {
  font-size: 0.8125rem;
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

/* Row-hover Floating Actions */
.row-actions-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.row-actions-trigger {
  width: 1.75rem;
  height: 1.75rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.row-floating-actions {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: none;
  background: var(--p-content-background);
  border: 1px solid var(--p-surface-200);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  border-radius: 999px;
  padding: 0.15rem 0.35rem;
  gap: 0.2rem;
  align-items: center;
  white-space: nowrap;
  z-index: 50;
}

.row-floating-actions :deep(.p-button) {
  width: 1.85rem;
  height: 1.85rem;
}

.row-floating-actions :deep(.p-button .p-button-icon) {
  font-size: 0.8rem;
}

.lead-datatable :deep(tr:hover) .row-actions-trigger {
  display: none;
}

.lead-datatable :deep(tr:hover) .row-floating-actions {
  display: flex;
  animation: fadeIn 0.15s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-50%) scale(0.95); }
  to { opacity: 1; transform: translateY(-50%) scale(1); }
}

/* Floating Bulk Action Dock matching original user layout */
.floating-bulk-dock {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: var(--p-content-background);
  border: 1px solid var(--p-primary-300);
  border-radius: 999px;
  padding: 0.5rem 0.85rem 0.5rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.dock-badge {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.86rem;
  color: var(--p-primary-800);
  font-weight: 500;
  white-space: nowrap;
}

.dock-badge i {
  color: var(--p-primary-600);
  font-size: 1rem;
}

.dock-divider {
  width: 1px;
  height: 20px;
  background: var(--p-surface-300);
}

.dock-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dock-slide-enter-active,
.dock-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.dock-slide-enter-from,
.dock-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
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

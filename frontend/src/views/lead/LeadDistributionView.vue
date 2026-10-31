<template>
  <div class="inquiry-list-view">
    <!-- Top Breadcrumb & Page Title (Exact same pattern as Inquiry.vue) -->
    <div class="page-header">
      <div class="header-left">
        <div class="breadcrumb-bar">
          <span class="breadcrumb-muted">Pages</span>
          <i class="pi pi-angle-right breadcrumb-separator"></i>
          <RouterLink to="/inquiries" class="breadcrumb-link">Inquiry Management</RouterLink>
          <i class="pi pi-angle-right breadcrumb-separator"></i>
          <span class="breadcrumb-active">Inquiry Distribution</span>
        </div>
        <div class="title-row">
          <h1><i class="pi pi-share-alt"></i> Inquiry Distribution</h1>
          <Tag :value="`${totalRecords} unassigned inquiries`" severity="warn" rounded class="count-tag" />
        </div>
      </div>

      <div class="header-actions">
        <Button label="Back to Inquiries" icon="pi pi-arrow-left" severity="secondary" text
          @click="$router.push('/inquiries')" />
      </div>
    </div>

    <!-- SLA Tier Quick Filter Bar -->
    <div class="sla-bar-container">
      <div class="sla-metrics-bar">
        <span class="sla-bar-label"><i class="pi pi-clock mr-1"></i> SLA Filter:</span>
        <button type="button" class="sla-chip" :class="{ active: selectedSlaTier === null }" @click="setSlaTier(null)">
          All ({{ totalUnassignedCount }})
        </button>
        <button type="button" class="sla-chip sla-normal" :class="{ active: selectedSlaTier === 'NORMAL' }"
          @click="setSlaTier('NORMAL')">
          <i class="pi pi-check-circle text-xs"></i> Normal &lt; 1d ({{ poolSummary.NORMAL }})
        </button>
        <button type="button" class="sla-chip sla-attention" :class="{ active: selectedSlaTier === 'ATTENTION' }"
          @click="setSlaTier('ATTENTION')">
          <i class="pi pi-info-circle text-xs"></i> Attention 1-2d ({{ poolSummary.ATTENTION }})
        </button>
        <button type="button" class="sla-chip sla-warning" :class="{ active: selectedSlaTier === 'WARNING' }"
          @click="setSlaTier('WARNING')">
          <i class="pi pi-exclamation-circle text-xs"></i> Warning 2-3d ({{ poolSummary.WARNING }})
        </button>
        <button type="button" class="sla-chip sla-overdue" :class="{ active: selectedSlaTier === 'OVERDUE' }"
          @click="setSlaTier('OVERDUE')">
          <i class="pi pi-bolt text-xs"></i> Overdue &gt; 3d ({{ poolSummary.OVERDUE }})
        </button>
      </div>
    </div>

    <!-- Table Container (Unified with InquiryList.vue) -->
    <div class="table-container">
      <DataTable :value="unassignedInquiries" v-model:selection="selectedInquiries" dataKey="id" :lazy="true" :loading="loading"
        :paginator="true" :rows="rowsPerPage" :totalRecords="totalRecords" :rowsPerPageOptions="[10, 20, 50, 100]"
        :removableSort="true" :scrollable="true" :scrollHeight="'calc(100vh - 270px)'" class="inquiry-datatable"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords}" :paginatorLeft="true"
        :paginatorRight="true" @page="onPageChange">
        <template #header>
          <!-- Primary Toolbar -->
          <div class="primary-toolbar">
            <div class="toolbar-spacer">
              <IconField>
                <InputIcon class="pi pi-search" />
                <InputText v-model="searchQuery"
                  placeholder="Search unassigned inquiries by student name, phone, email, source..." class="search-input" />
              </IconField>
            </div>
            <div class="toolbar-actions" v-if="selectedInquiries.length > 0">
              <Button :label="`Distribute (${selectedInquiries.length})`" icon="pi pi-share-alt" severity="primary"
                @click="openDistributeModal(selectedInquiries)" class="distribute-btn" />
            </div>
          </div>

          <!-- Secondary Toolbar -->
          <div class="secondary-toolbar">
            <div class="secondary-left">
              <Button icon="pi pi-refresh" text rounded v-tooltip.top="'Refresh Pool'" @click="fetchPoolData" />

              <span v-if="selectedInquiries.length > 0" class="selection-count">
                {{ selectedInquiries.length }} Selected
              </span>

              <span v-else class="result-count">
                {{ totalRecords }} Unassigned Inquiries
              </span>
            </div>
          </div>
        </template>

        <!-- Empty State -->
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-check-circle text-emerald-500"></i>
            <h3>No unassigned inquiries found</h3>
            <p>All inquiries have been assigned to staff or no inquiries match your search criteria.</p>
          </div>
        </template>

        <!-- Multi-select Checkbox Column -->
        <Column selectionMode="multiple" headerStyle="width: 2.5rem" bodyStyle="width: 2.5rem" :exportable="false" />

        <!-- Student Column (Inquiry student info: Name, Phone, Email) -->
        <Column field="student.fullName" header="Student" sortable style="min-width: 220px">
          <template #body="{ data }">
            <div class="student-cell-wrap" v-if="data.student">
              <span class="student-name">{{ data.student.fullName }}</span>
              <div class="student-sub-contact">
                <span class="sub-phone" v-if="data.student.mobile"><i class="pi pi-phone text-xs mr-1"></i>{{
                  data.student.mobile }}</span>
                <span class="sub-email" v-if="data.student.email"><i class="pi pi-envelope text-xs mr-1"></i>{{
                  data.student.email }}</span>
              </div>
            </div>
            <span v-else class="text-muted">Unlinked Student</span>
          </template>
        </Column>

        <!-- Source Column -->
        <Column field="source" header="Source" sortable style="min-width: 160px">
          <template #body="{ data }">
            <Tag :value="data.source || 'Direct'" severity="secondary" rounded class="status-tag" />
          </template>
        </Column>

        <!-- Source Detail Column -->
        <Column field="sourceDetail" header="Source Detail" sortable style="min-width: 200px">
          <template #body="{ data }">
            <span class="desc-cell" v-tooltip.top="data.sourceDetail">
              {{ data.sourceDetail || '—' }}
            </span>
          </template>
        </Column>

        <!-- Unprocessed Time Column (Duration & SLA Tier) -->
        <Column header="Unprocessed Time" style="min-width: 210px">
          <template #body="{ data }">
            <div class="unprocessed-cell">
              <Tag :value="getSlaLabel(data.slaTier)" :severity="getSlaSeverity(data.slaTier)" rounded
                class="status-tag" />
              <span class="unprocessed-elapsed">{{ formatDuration(data.elapsedMinutes) }}</span>
            </div>
          </template>
        </Column>

        <!-- Created Date Column -->
        <Column field="createdAt" header="Created" sortable style="width: 120px">
          <template #body="{ data }">
            <div class="created-cell">
              <span>{{ formatCompactDate(data.createdAt) }}</span>
              <span class="created-time">{{ formatCompactTime(data.createdAt) }}</span>
            </div>
          </template>
        </Column>

        <!-- Actions Column (Distribute Inquiry) -->
        <Column header="Actions" style="width: 110px" :exportable="false" frozen alignFrozen="right">
          <template #body="{ data }">
            <div class="action-buttons">
              <Button icon="pi pi-arrow-circle-right" rounded outlined severity="primary" v-tooltip.top="'Distribute this inquiry'"
                @click="openDistributeModal([data])" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Floating Bulk Action Dock when inquiries are selected (User's Original Layout Design) -->
    <transition name="dock-slide">
      <div v-if="selectedInquiries.length > 0" class="floating-bulk-dock">
        <div class="dock-badge">
          <i class="pi pi-check-circle"></i>
          <span>Selected <strong>{{ selectedInquiries.length }}</strong> unassigned inquiries</span>
        </div>
        <div class="dock-divider"></div>
        <div class="dock-actions">
          <Button
            :label="`Distribute ${selectedInquiries.length} Inquiries (Round-Robin)`"
            icon="pi pi-share-alt"
            severity="primary"
            size="small"
            @click="openDistributeModal(selectedInquiries)"
          />
          <Button
            icon="pi pi-times"
            text
            rounded
            severity="secondary"
            size="small"
            v-tooltip.top="'Clear selection'"
            @click="selectedInquiries = []"
          />
        </div>
      </div>
    </transition>

    <!-- Inquiry Distribution Modal Component -->
    <InquiryDistributionModal v-model:visible="modalVisible" :selectedInquiries="inquiriesForModal"
      @distributed="handleDistributionSuccess" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { useToast } from 'primevue/usetoast'

import InquiryDistributionModal from '@/components/inquiry/InquiryDistributionModal.vue'
import { getUnassignedPool } from '@/services/inquiryDistributionService'
import { formatCompactDate, formatCompactTime } from '@/utils/dateUtils'

const toast = useToast()

const loading = ref(false)
const unassignedInquiries = ref([])
const selectedInquiries = ref([])
const searchQuery = ref('')
const totalRecords = ref(0)
const currentPage = ref(1)
const rowsPerPage = ref(20)
const selectedSlaTier = ref(null)

const poolSummary = ref({
  NORMAL: 0,
  ATTENTION: 0,
  WARNING: 0,
  OVERDUE: 0
})

const totalUnassignedCount = computed(() => {
  return (
    (poolSummary.value.NORMAL || 0) +
    (poolSummary.value.ATTENTION || 0) +
    (poolSummary.value.WARNING || 0) +
    (poolSummary.value.OVERDUE || 0)
  )
})

const getSlaLabel = (tier) => {
  switch (tier) {
    case 'NORMAL': return 'Normal (< 1d)'
    case 'ATTENTION': return 'Attention (1-2d)'
    case 'WARNING': return 'Warning (2-3d)'
    case 'OVERDUE': return 'Overdue (> 3d)'
    default: return tier || 'Normal'
  }
}

const getSlaSeverity = (tier) => {
  switch (tier) {
    case 'NORMAL': return 'success'
    case 'ATTENTION': return 'info'
    case 'WARNING': return 'warn'
    case 'OVERDUE': return 'danger'
    default: return 'secondary'
  }
}

const formatDuration = (elapsedMinutes) => {
  if (!elapsedMinutes && elapsedMinutes !== 0) return '0h'
  const hours = Math.floor(elapsedMinutes / 60)
  const days = Math.floor(hours / 24)
  if (days >= 1) {
    const remHours = hours % 24
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`
  }
  return `${hours}h`
}

const fetchPoolData = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: rowsPerPage.value,
      ...(searchQuery.value && { search: searchQuery.value.trim() }),
      ...(selectedSlaTier.value && { slaTier: selectedSlaTier.value })
    }
    const res = await getUnassignedPool(params)
    unassignedInquiries.value = res.data || []
    totalRecords.value = res.pagination?.totalCount || 0
    if (res.summary) {
      poolSummary.value = res.summary
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'Failed to load unassigned inquiries pool',
      life: 4000
    })
  } finally {
    loading.value = false
  }
}

let debounceTimer = null
watch(searchQuery, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    currentPage.value = 1
    fetchPoolData()
  }, 350)
})

const setSlaTier = (tier) => {
  selectedSlaTier.value = tier
  currentPage.value = 1
  fetchPoolData()
}

const onPageChange = (event) => {
  currentPage.value = (event.page || 0) + 1
  rowsPerPage.value = event.rows || 20
  fetchPoolData()
}

// Modal state
const modalVisible = ref(false)
const inquiriesForModal = ref([])

const openDistributeModal = (inquiries) => {
  if (!inquiries || inquiries.length === 0) {
    toast.add({
      severity: 'warn',
      summary: 'No inquiries selected',
      detail: 'Please select at least one inquiry to distribute',
      life: 3000
    })
    return
  }
  inquiriesForModal.value = [...inquiries]
  modalVisible.value = true
}

const handleDistributionSuccess = () => {
  selectedInquiries.value = []
  fetchPoolData()
}

onMounted(() => {
  fetchPoolData()
})
</script>

<style scoped>
/* Page Layout matching Inquiry.vue */
.inquiry-list-view {
  padding: 1.5rem 2rem;
  max-width: 100%;
}

.page-header {
  margin-bottom: 1rem;
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

.breadcrumb-link {
  color: var(--p-text-muted-color);
  text-decoration: none;
}

.breadcrumb-link:hover {
  color: var(--p-primary-color);
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

.count-tag {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
}

/* SLA Quick Filter Bar */
.sla-bar-container {
  margin-bottom: 1rem;
  background: var(--p-surface-0);
  border: 1px solid var(--p-border-color);
  border-radius: 8px;
  padding: 0.6rem 1rem;
}

.sla-metrics-bar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.sla-bar-label {
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  margin-right: 0.25rem;
}

.sla-chip {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.785rem;
  font-weight: 600;
  border: 1px solid var(--p-border-color);
  background: var(--p-surface-ground);
  color: var(--p-text-muted-color);
  transition: all 0.15s ease;
}

.sla-chip:hover {
  border-color: var(--p-primary-500);
}

.sla-chip.active {
  border-color: var(--p-primary-color);
  background: var(--p-primary-50);
  color: var(--p-primary-700);
}

.sla-chip.sla-normal.active {
  background: rgba(16, 185, 129, 0.12);
  border-color: #10b981;
  color: #047857;
}

.sla-chip.sla-attention.active {
  background: rgba(59, 130, 246, 0.12);
  border-color: #3b82f6;
  color: #1d4ed8;
}

.sla-chip.sla-warning.active {
  background: rgba(245, 158, 11, 0.12);
  border-color: #f59e0b;
  color: #b45309;
}

.sla-chip.sla-overdue.active {
  background: rgba(239, 68, 68, 0.12);
  border-color: #ef4444;
  color: #b91c1c;
}

/* Table Container */
.table-container {
  background: var(--p-surface-0);
  border: 1px solid var(--p-border-color);
  border-radius: 8px;
  overflow: hidden;
}

/* Toolbars */
.primary-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-border-color);
  gap: 1rem;
}

.toolbar-spacer {
  flex: 1;
  max-width: 480px;
}

.search-input {
  width: 100%;
}

.toolbar-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.distribute-btn {
  font-weight: 600;
}

.secondary-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: var(--p-surface-50);
  border-bottom: 1px solid var(--p-border-color);
  font-size: 0.85rem;
}

.secondary-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.selection-count {
  font-weight: 600;
  color: var(--p-primary-color);
}

.result-count {
  color: var(--p-text-muted-color);
}

/* Cell Formatting */
.student-cell-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.student-name {
  font-weight: 600;
  color: var(--p-text-color);
}

.student-sub-contact {
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.user-name {
  font-weight: 500;
}

.desc-cell {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  color: var(--p-text-muted-color);
}

.unprocessed-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.unprocessed-elapsed {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
  font-weight: 500;
}

.created-cell {
  display: flex;
  flex-direction: column;
  font-size: 0.8rem;
}

.created-time {
  font-size: 0.7rem;
  color: var(--p-text-muted-color);
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.status-tag {
  font-size: 0.75rem;
  padding: 0.15rem 0.45rem;
  font-weight: 600;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-state i {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
  margin: 0;
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
  transform: translate(-50%, 30px);
}

@media (max-width: 768px) {
  .floating-bulk-dock {
    width: 90%;
    border-radius: 14px;
    flex-direction: column;
    padding: 0.75rem;
    gap: 0.5rem;
  }
  .dock-divider {
    display: none;
  }
}
</style>

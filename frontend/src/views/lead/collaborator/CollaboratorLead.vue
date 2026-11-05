<template>
  <div class="collaborator-lead-view">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="breadcrumb-bar">
          <span class="breadcrumb-muted">Pages</span>
          <i class="pi pi-angle-right breadcrumb-separator"></i>
          <span class="breadcrumb-active">My Leads</span>
        </div>
        <div class="title-row">
          <h1><i class="pi pi-ticket"></i> My Created Leads</h1>
          <div class="stats-badges">
            <Tag :value="`Today: ${stats.today}`" severity="success" rounded />
            <Tag :value="`Week: ${stats.this_week}`" severity="info" rounded />
            <Tag :value="`Month: ${stats.this_month}`" severity="warn" rounded />
            <Tag :value="`Total: ${stats.total || pagination?.totalCount || 0}`" severity="secondary" rounded />
          </div>
        </div>
      </div>
    </div>

    <!-- Table Container -->
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
        dataKey="id" 
        :removableSort="true" 
        :scrollable="true" 
        :scrollHeight="'calc(100vh - 200px)'" 
        class="collaborator-datatable"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
        :paginatorLeft="true" 
        :paginatorRight="true"
      >
        <template #header>
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
                label="Import Excel" 
                icon="pi pi-file-excel" 
                text 
                @click="router.push('/leads/import')" 
                class="import-btn" 
              />
              <Button 
                label="New Lead" 
                icon="pi pi-plus"
                @click="router.push('/collaborator/leads/new')" 
              />
            </div>
          </div>
        </template>

        <!-- Empty State -->
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-inbox"></i>
            <h3>No leads found</h3>
            <p>Get started by submitting a new lead.</p>
            <Button 
              label="New Lead" 
              icon="pi pi-plus" 
              class="mt-3"
              @click="router.push('/collaborator/leads/new')" 
            />
          </div>
        </template>

        <!-- Columns (All except 3 status columns) -->
        

        <Column field="student.fullName" header="Full Name" sortable style="min-width: 160px">
          <template #body="{ data }">
            <span v-if="data.student" class="student-name">{{ data.student.fullName }}</span>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column header="Mobile" style="min-width: 130px">
          <template #body="{ data }">
            <a v-if="data.student?.mobile || data.mobile" :href="`tel:${data.student?.mobile || data.mobile}`" class="phone-link">
              <i class="pi pi-phone text-xs"></i> {{ data.student?.mobile || data.mobile }}
            </a>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column header="Email" style="min-width: 160px">
          <template #body="{ data }">
            <span v-if="data.student?.email || data.email" class="text-sm">{{ data.student?.email || data.email }}</span>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column header="Birth Date" style="min-width: 110px">
          <template #body="{ data }">
            <span v-if="data.student?.birthDate || data.birthDate">{{ formatDate(data.student?.birthDate || data.birthDate) }}</span>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column header="Gender" style="min-width: 100px">
          <template #body="{ data }">
            <span v-if="data.student?.gender || data.gender">{{ data.student?.gender || data.gender }}</span>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column header="School & Province" style="min-width: 180px">
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

        <Column header="Interested Major" style="min-width: 160px">
          <template #body="{ data }">
            <span v-if="data.student?.specializedRegister?.interestedMajor" class="major-text">
              {{ data.student.specializedRegister.interestedMajor.label || data.student.specializedRegister.interestedMajor.name }}
            </span>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column header="Specific Major" style="min-width: 160px">
          <template #body="{ data }">
            <span v-if="data.student?.specializedRegister?.specificMajor" class="major-text">
              {{ data.student.specializedRegister.specificMajor.label || data.student.specializedRegister.specificMajor.name }}
            </span>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column header="Admission Year" style="min-width: 120px">
          <template #body="{ data }">
            <span>{{ data.student?.specializedRegister?.admissionYear || '—' }}</span>
          </template>
        </Column>

        <Column header="Source" style="min-width: 120px">
          <template #body="{ data }">
            <Tag 
              v-if="getSourceLevel(data.sourceData, 'source') !== '—'" 
              :value="getSourceLevel(data.sourceData, 'source')" 
              :severity="getSourceSeverity(data.sourceData)" 
              :icon="getSourceIcon(data.sourceData)"
              rounded 
              class="source-tag"
            />
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column field="description" header="Description" sortable style="min-width: 180px">
          <template #body="{ data }">
            <span 
              v-if="data.description" 
              class="desc-cell" 
              :title="data.description"
            >
              {{ data.description }}
            </span>
            <span v-else class="null-text">—</span>
          </template>
        </Column>

        <Column header="Created By" style="min-width: 150px">
          <template #body="{ data }">
            <span v-if="data.createdBy" class="user-name">{{ data.createdBy.fullName }}</span>
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
        <Column header="" style="width: 50px; text-align: center" :exportable="false">
          <template #body="{ data }">
            <Button 
              icon="pi pi-pencil" 
              rounded 
              text 
              severity="info" 
              size="small"
              aria-label="Edit Lead"
              v-tooltip.top="'Edit Lead'"
              @click="router.push(`/leads/${data.id}`)" 
            />
          </template>
        </Column>
      </DataTable>
    </div>
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
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'

import { useLead } from '@/composables/useLead'
import { useTableQuery } from '@/composables/useTableQuery'
import { getCreatedLeadStats } from '@/services/leadService'
import { getSourceLevel } from '@/utils/leadLabels'
import { formatCompactDate, formatCompactTime, formatDate } from '@/utils/dateUtils'

const router = useRouter()
const toast = useToast()

const { leads, pagination, loading, fetchLeads } = useLead()
const stats = ref({ today: 0, this_week: 0, this_month: 0, total: 0 })

const loadStats = async () => {
  try {
    const res = await getCreatedLeadStats()
    if (res) stats.value = res
  } catch {
    // Non-critical background metric
  }
}

const { loadData, onPageChange, onSort, onSearch } = useTableQuery(
  async (params) => {
    try {
      await fetchLeads(params)
    } catch {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load leads', life: 5000 })
    }
  }
)

onMounted(() => {
  loadData()
  loadStats()
})

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
</script>

<style scoped>
.collaborator-lead-view {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.breadcrumb-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  margin-bottom: 0.25rem;
}
.breadcrumb-muted { color: var(--p-text-muted-color); }
.breadcrumb-separator { font-size: 0.7rem; color: var(--p-text-muted-color); }
.breadcrumb-active { color: var(--p-text-color); font-weight: 500; }

.title-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.title-row h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--p-text-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stats-badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.table-container {
  background: var(--p-content-background);
  border: 1px solid var(--p-surface-200);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.primary-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-200);
}
.toolbar-spacer { flex: 1; max-width: 320px; }
.search-input { width: 100%; }

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--p-text-muted-color);
}
.empty-state i {
  font-size: 3rem;
  margin-bottom: 1rem;
  display: block;
}
.empty-state h3 {
  font-size: 1.125rem;
  color: var(--p-text-color);
  margin: 0 0 0.5rem;
}

.user-name, .student-name {
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
.phone-link:hover { text-decoration: underline; }

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

.source-tag {
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
</style>


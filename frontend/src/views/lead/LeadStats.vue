<template>
  <div class="lead-list-view lead-stats-view collaborator-stats-view">
    <!-- Top Breadcrumb & Page Title -->
    <div class="page-header">
      <div class="header-left">
        <div class="breadcrumb-bar">
          <span class="breadcrumb-muted">Pages</span>
          <i class="pi pi-angle-right breadcrumb-separator"></i>
          <RouterLink to="/leads" class="breadcrumb-link">Lead Management</RouterLink>
          <i class="pi pi-angle-right breadcrumb-separator"></i>
          <span class="breadcrumb-active">Lead Stats</span>
        </div>
        <div class="title-row">
          <h1><i class="pi pi-chart-bar"></i> Sub-Team & Collaborator Lead Statistics</h1>
          <Tag 
            v-if="parentTeam?.name" 
            :value="`Team: ${parentTeam.name}`" 
            severity="info" 
            rounded 
            class="team-tag" 
          />
        </div>
      </div>

      <div class="header-actions">
        <Button 
          label="Back to Leads" 
          icon="pi pi-arrow-left" 
          severity="secondary" 
          text 
          @click="router.push('/leads')" 
        />
      </div>
    </div>

    <!-- Error State / Access Denied -->
    <div v-if="errorMessage" class="error-banner mb-3 p-3 surface-card border-round shadow-1">
      <div class="flex align-items-center gap-2 text-red-600">
        <i class="pi pi-exclamation-triangle text-xl"></i>
        <span class="font-medium">{{ errorMessage }}</span>
      </div>
    </div>

    <!-- Filter Toolbar Card -->
    <div class="filter-card surface-card p-3 border-round shadow-1 mb-3">
      <div class="flex flex-wrap align-items-center justify-content-between gap-3">
        <!-- Preset Time Filters -->
        <div class="flex flex-wrap align-items-center gap-2">
          <span class="text-sm font-semibold text-color-secondary mr-1">Time Window:</span>
          <button 
            v-for="p in presets" 
            :key="p.value"
            type="button" 
            class="preset-chip"
            :class="{ active: selectedPreset === p.value }"
            @click="selectPreset(p.value)"
          >
            {{ p.label }}
          </button>
        </div>

        <!-- Sub-Team Selector & Refresh -->
        <div class="flex flex-wrap align-items-center gap-2">
          <!-- Custom Date Range Picker -->
          <div v-if="selectedPreset === 'custom'" class="custom-date-picker">
            <DatePicker 
              v-model="customDateRange" 
              selectionMode="range" 
              dateFormat="dd-mm-yy" 
              placeholder="DD-MM-YYYY - DD-MM-YYYY" 
              showIcon 
              class="w-16rem"
              @update:modelValue="onCustomDateChange"
            />
          </div>

          <span class="text-sm font-semibold text-color-secondary ml-2">Sub-Team:</span>
          <Select 
            v-model="selectedSubTeamId" 
            :options="subTeamOptions" 
            optionLabel="label" 
            optionValue="value" 
            placeholder="All Subordinate Teams" 
            class="w-14rem"
            @change="loadStats"
          />

          <Button 
            icon="pi pi-refresh" 
            text 
            rounded 
            aria-label="Refresh" 
            :loading="loading" 
            @click="loadStats" 
          />
        </div>
      </div>
    </div>

    <!-- KPI Metric Cards Row -->
    <div class="grid mb-3">
      <!-- Total Created Leads -->
      <div class="col-12 sm:col-4">
        <div class="surface-card p-3 border-round shadow-1 border-left-3 border-primary flex align-items-center justify-content-between">
          <div>
            <div class="text-color-secondary font-medium text-sm mb-1">Total Created Leads</div>
            <div class="text-3xl font-bold text-primary">{{ metrics.totalCreatedLeads }}</div>
            <div class="text-xs text-color-secondary mt-1">
              {{ formattedDateRange }}
            </div>
          </div>
          <div class="w-3rem h-3rem border-circle bg-primary-reverse flex align-items-center justify-content-center">
            <i class="pi pi-user-plus text-primary text-xl"></i>
          </div>
        </div>
      </div>

      <!-- Active Contributors -->
      <div class="col-12 sm:col-4">
        <div class="surface-card p-3 border-round shadow-1 border-left-3 border-green-500 flex align-items-center justify-content-between">
          <div>
            <div class="text-color-secondary font-medium text-sm mb-1">Active Contributors</div>
            <div class="text-3xl font-bold text-green-600">{{ metrics.activeContributors }}</div>
            <div class="text-xs text-color-secondary mt-1">
              out of {{ members.length }} team members
            </div>
          </div>
          <div class="w-3rem h-3rem border-circle bg-green-50 flex align-items-center justify-content-center">
            <i class="pi pi-users text-green-600 text-xl"></i>
          </div>
        </div>
      </div>

      <!-- Daily Average -->
      <div class="col-12 sm:col-4">
        <div class="surface-card p-3 border-round shadow-1 border-left-3 border-purple-500 flex align-items-center justify-content-between">
          <div>
            <div class="text-color-secondary font-medium text-sm mb-1">Daily Average Intake</div>
            <div class="text-3xl font-bold text-purple-600">{{ metrics.dailyAverage }}</div>
            <div class="text-xs text-color-secondary mt-1">leads / day</div>
          </div>
          <div class="w-3rem h-3rem border-circle bg-purple-50 flex align-items-center justify-content-center">
            <i class="pi pi-chart-line text-purple-600 text-xl"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Collaborator Member Table Container -->
    <div class="table-container">
      <DataTable 
        :value="filteredMembers" 
        dataKey="accountId" 
        :loading="loading" 
        :scrollable="true" 
        scrollHeight="calc(100vh - 350px)" 
        class="lead-datatable"
      >
        <template #header>
          <div class="flex flex-wrap align-items-center justify-content-between gap-2 p-2">
            <div class="flex align-items-center gap-2">
              <span class="font-semibold text-lg">Collaborator Performance Breakdown</span>
              <Tag :value="`${members.length} members`" severity="secondary" rounded />
            </div>
            <IconField class="w-16rem">
              <InputIcon class="pi pi-search" />
              <InputText 
                v-model="searchQuery" 
                placeholder="Search collaborator..." 
                class="w-full text-sm" 
              />
            </IconField>
          </div>
        </template>

        <template #empty>
          <div class="p-4 text-center text-color-secondary">
            <i class="pi pi-inbox text-3xl mb-2"></i>
            <div>No collaborator members or lead submissions found for this period.</div>
          </div>
        </template>

        <!-- Columns -->
        <Column header="#" style="width: 4rem" class="text-center">
          <template #body="{ index }">
            <span class="text-color-secondary font-medium">{{ index + 1 }}</span>
          </template>
        </Column>

        <Column field="fullName" header="Collaborator Name" sortable style="min-width: 14rem">
          <template #body="{ data }">
            <div class="flex align-items-center gap-2">
              <i class="pi pi-user text-color-secondary"></i>
              <span class="font-medium text-color">{{ data.fullName }}</span>
            </div>
          </template>
        </Column>

        <Column field="teamName" header="Sub-Team" sortable style="min-width: 10rem">
          <template #body="{ data }">
            <Tag :value="data.teamName" severity="info" rounded class="text-xs" />
          </template>
        </Column>

        <Column field="email" header="Email" style="min-width: 14rem">
          <template #body="{ data }">
            <span class="text-color-secondary text-sm">{{ data.email || '—' }}</span>
          </template>
        </Column>

        <Column field="createdLeadsCount" header="Created Leads" sortable style="min-width: 9rem" class="text-right">
          <template #body="{ data }">
            <Tag 
              :value="`${data.createdLeadsCount} leads`" 
              :severity="data.createdLeadsCount > 0 ? 'success' : 'secondary'" 
              rounded 
              class="font-bold" 
            />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Tag from 'primevue/tag'

import { getLeadStats } from '@/services/leadService'
import { formatDate } from '@/utils/dateUtils'

const router = useRouter()

const loading = ref(false)
const errorMessage = ref('')
const selectedPreset = ref('today')
const selectedSubTeamId = ref(null)
const customDateRange = ref(null)
const searchQuery = ref('')

const parentTeam = ref(null)
const subTeams = ref([])
const metrics = ref({
  totalCreatedLeads: 0,
  activeContributors: 0,
  dailyAverage: 0
})
const members = ref([])
const timeWindow = ref(null)

const presets = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'last_7_days' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last 3 Months', value: 'last_3_months' },
  { label: 'Custom', value: 'custom' }
]

const subTeamOptions = computed(() => {
  return [
    { label: 'All Subordinate Teams', value: null },
    ...subTeams.value.map(st => ({
      label: st.name,
      value: st.id
    }))
  ]
})

const filteredMembers = computed(() => {
  if (!searchQuery.value.trim()) return members.value
  const q = searchQuery.value.toLowerCase().trim()
  return members.value.filter(m => 
    (m.fullName && m.fullName.toLowerCase().includes(q)) ||
    (m.email && m.email.toLowerCase().includes(q)) ||
    (m.teamName && m.teamName.toLowerCase().includes(q))
  )
})

const formattedDateRange = computed(() => {
  if (!timeWindow.value) return ''
  const from = formatDate(timeWindow.value.from)
  const to = formatDate(timeWindow.value.to)
  if (from === to) return from
  return `${from} - ${to}`
})

const selectPreset = (val) => {
  selectedPreset.value = val
  if (val !== 'custom') {
    customDateRange.value = null
    loadStats()
  }
}

const onCustomDateChange = (val) => {
  if (Array.isArray(val) && val[0] && val[1]) {
    loadStats()
  }
}

const formatIsoDate = (d) => {
  if (!d) return null
  const date = new Date(d)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const loadStats = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const params = {
      timePreset: selectedPreset.value
    }
    if (selectedSubTeamId.value) {
      params.subTeamId = selectedSubTeamId.value
    }
    if (selectedPreset.value === 'custom' && Array.isArray(customDateRange.value) && customDateRange.value[0] && customDateRange.value[1]) {
      params.from = formatIsoDate(customDateRange.value[0])
      params.to = formatIsoDate(customDateRange.value[1])
    }

    const data = await getLeadStats(params)
    if (data) {
      parentTeam.value = data.parentTeam
      subTeams.value = data.subTeams || []
      metrics.value = data.metrics || { totalCreatedLeads: 0, activeContributors: 0, dailyAverage: 0 }
      members.value = data.members || []
      timeWindow.value = data.timeWindow || null
    }
  } catch (err) {
    errorMessage.value = err.response?.data?.message || err.message || 'Failed to load lead statistics'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.lead-stats-view,
.collaborator-stats-view {
  padding: 1.5rem;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.preset-chip {
  background: var(--p-surface-100);
  border: 1px solid var(--p-surface-200);
  color: var(--p-text-color);
  padding: 0.4rem 0.85rem;
  border-radius: 9999px;
  font-size: 0.825rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.preset-chip:hover {
  background: var(--p-surface-200);
}

.preset-chip.active {
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
  border-color: var(--p-primary-color);
}

.border-primary {
  border-color: var(--p-primary-color) !important;
}

.border-left-3 {
  border-left-width: 3px !important;
  border-left-style: solid !important;
}
</style>


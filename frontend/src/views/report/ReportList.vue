<template>
  <div class="report-list-view">
    <div class="page-header">
      <h1>Error Reports</h1>
      <Button label="New Report" icon="pi pi-plus" @click="$router.push('/reports/new')" />
    </div>

    <DataTable :value="reports" :loading="loading" stripedRows responsiveLayout="scroll"
      class="report-table" @row-click="onRowClick" :rowHover="true">
      <Column field="id" header="ID" style="width: 60px" />
      <Column field="title" header="Title" />
      <Column field="reportedBy.fullName" header="Reported By" style="width: 160px" />
      <Column field="status" header="Status" style="width: 140px">
        <template #body="{ data }">
          <Tag :value="formatStatus(data.status)" :severity="statusSeverity(data.status)" />
        </template>
      </Column>
      <Column field="createdAt" header="Date" style="width: 160px">
        <template #body="{ data }">
          {{ new Date(data.createdAt).toLocaleDateString() }}
        </template>
      </Column>
      <Column header="Actions" style="width: 200px">
        <template #body="{ data }">
          <Select 
            :modelValue="data.status" 
            :options="statusOptions" 
            optionLabel="label" 
            optionValue="value"
            placeholder="Change status"
            size="small"
            @update:modelValue="(val) => changeStatus(data.id, val)"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import api from '@/services/apiClient'

const router = useRouter()
const toast = useToast()
const reports = ref([])
const loading = ref(false)

const statusOptions = [
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' }
]

const formatStatus = (status) => {
  return status.replace('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())
}

const statusSeverity = (status) => {
  const map = { OPEN: 'danger', IN_PROGRESS: 'warn', RESOLVED: 'success' }
  return map[status] || 'info'
}

const fetchReports = async () => {
  loading.value = true
  try {
    const { data } = await api.get('/error-reports')
    reports.value = data.data
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load reports', life: 3000 })
  } finally {
    loading.value = false
  }
}

const changeStatus = async (id, status) => {
  try {
    await api.patch(`/error-reports/${id}/status`, { status })
    toast.add({ severity: 'success', summary: 'Updated', detail: 'Status updated', life: 2000 })
    await fetchReports()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status', life: 3000 })
  }
}

const onRowClick = (event) => {
  router.push(`/reports/${event.data.id}`)
}

onMounted(fetchReports)
</script>

<style scoped>
.report-list-view { padding: 1.5rem 2rem; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--p-text-color); }
.report-table { border-radius: 12px; overflow: hidden; }
</style>

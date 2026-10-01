<template>
  <div class="report-detail-view">
    <div class="page-header">
      <h1>Report #{{ $route.params.id }}</h1>
      <Button label="Back to Reports" severity="secondary" icon="pi pi-arrow-left" @click="$router.push('/reports')" />
    </div>

    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <p>Loading report...</p>
    </div>

    <div v-else-if="notFound" class="empty-state">
      <i class="pi pi-exclamation-triangle"></i>
      <h3>Report Not Found</h3>
      <Button label="Back to Reports" icon="pi pi-arrow-left" @click="$router.push('/reports')" />
    </div>

    <div v-else class="cards-container">
      <!-- Report Info -->
      <div class="section-card">
        <div class="card-header">
          <h2><i class="pi pi-flag"></i> {{ report.title }}</h2>
          <Tag :value="formatStatus(report.status)" :severity="statusSeverity(report.status)" />
        </div>

        <div class="detail-grid">
          <div class="detail-row">
            <span class="detail-label">Reported By</span>
            <span class="detail-value">{{ report.reportedBy?.fullName || '—' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Email</span>
            <span class="detail-value">{{ report.reportedBy?.email || '—' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date</span>
            <span class="detail-value">{{ new Date(report.createdAt).toLocaleString() }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Status</span>
            <Select 
              v-model="report.status" 
              :options="statusOptions" 
              optionLabel="label" 
              optionValue="value"
              size="small"
              @update:modelValue="changeStatus"
            />
          </div>
        </div>
      </div>

      <!-- Description -->
      <div class="section-card" v-if="report.description">
        <div class="card-header">
          <h2><i class="pi pi-align-left"></i> Description</h2>
        </div>
        <p class="description-text">{{ report.description }}</p>
      </div>

      <!-- Screenshot -->
      <div class="section-card" v-if="report.imageUrl">
        <div class="card-header">
          <h2><i class="pi pi-image"></i> Screenshot</h2>
          <a :href="report.imageUrl" target="_blank" rel="noopener">
            <Button label="Open Full Size" icon="pi pi-external-link" size="small" text />
          </a>
        </div>
        <div class="screenshot-container">
          <img :src="report.imageUrl" alt="Error screenshot" class="screenshot-image" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import api from '@/services/apiClient'

const route = useRoute()
const toast = useToast()

const report = ref({})
const loading = ref(true)
const notFound = ref(false)

const statusOptions = [
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' }
]

const formatStatus = (status) => {
  return status?.replace('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()) || ''
}

const statusSeverity = (status) => {
  const map = { OPEN: 'danger', IN_PROGRESS: 'warn', RESOLVED: 'success' }
  return map[status] || 'info'
}

const fetchReport = async () => {
  try {
    const { data } = await api.get(`/error-reports/${route.params.id}`)
    report.value = data.data
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

const changeStatus = async (status) => {
  try {
    await api.patch(`/error-reports/${route.params.id}/status`, { status })
    toast.add({ severity: 'success', summary: 'Updated', detail: 'Status updated', life: 2000 })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status', life: 3000 })
  }
}

onMounted(fetchReport)
</script>

<style scoped>
.report-detail-view { padding: 1.5rem 2rem; max-width: 900px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--p-text-color); }

.loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; padding: 4rem; gap: 0.75rem; color: var(--p-text-muted-color); }
.empty-state i { font-size: 3rem; color: var(--p-orange-400); }
.empty-state h3 { margin: 0 0 1rem 0; color: var(--p-text-color); }

.cards-container { display: flex; flex-direction: column; gap: 1.5rem; }

.section-card {
  background: var(--p-content-background);
  border: 1px solid var(--p-surface-200);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.card-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 1.5rem; border-bottom: 1px solid var(--p-surface-100); padding-bottom: 0.75rem;
}
.card-header h2 { font-size: 1.15rem; margin: 0; display: flex; align-items: center; gap: 0.5rem; color: var(--p-text-color); }
.card-header h2 i { color: var(--p-primary-color); }

.detail-grid { display: flex; flex-direction: column; gap: 0.85rem; }
.detail-row { display: flex; align-items: center; gap: 1rem; }
.detail-label { font-size: 0.85rem; font-weight: 600; color: var(--p-text-muted-color); min-width: 120px; }
.detail-value { font-size: 0.9rem; color: var(--p-text-color); }

.description-text { margin: 0; font-size: 0.9rem; line-height: 1.6; color: var(--p-text-color); white-space: pre-wrap; }

.screenshot-container { display: flex; justify-content: center; }
.screenshot-image { max-width: 100%; max-height: 500px; border-radius: 8px; border: 1px solid var(--p-surface-200); }
</style>

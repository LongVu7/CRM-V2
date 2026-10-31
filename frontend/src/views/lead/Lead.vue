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
          @click="$router.push('/leads/distribution')"
        />
      </div>
    </div>

    <!-- Main Lead Table View -->
    <LeadList 
      :leads="leads"
      :loading="loading"
      :exporting="exporting"
      :syncing="syncing"
      :pagination="pagination"
      @page-change="onPageChange"
      @search="onSearch"
      @delete="onDelete"
      @delete-selected="onDeleteSelected"
      @show="onShow"
      @edit="onEdit"
      @export="onExport"
      @sync-sheets="onSyncSheets"
      @filter="onFilter"
      @sort="onSort"
    />

    <!-- Lead Details Dialog -->
    <LeadShowDialog
      v-model:visible="showDialogVisible"
      :leadId="showDialogLeadId"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'

import LeadList from '@/components/lead/LeadList.vue'
import LeadShowDialog from '@/components/lead/LeadShowDialog.vue'

import { useLead } from '@/composables/useLead'
import { useTableQuery } from '@/composables/useTableQuery'
import { exportLeads, syncGoogleSheets } from '@/services/leadService'

const router = useRouter()
const { leads, pagination, loading, fetchLeads, deleteLead, deleteLeads } = useLead()
const toast = useToast()

const { currentParams, loadData, onPageChange, onSort, onSearch, onFilter } = useTableQuery(
  async (params) => {
    try {
      await fetchLeads(params)
    } catch {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load leads', life: 5000 })
    }
  }
)

// Dialog states
const showDialogVisible = ref(false)
const showDialogLeadId = ref(null)
const exporting = ref(false)
const syncing = ref(false)

const onEdit = (leadId) => {
  router.push(`/leads/${leadId}`)
}

onMounted(() => loadData())

const onDelete = async (id) => {
  try {
    await deleteLead(id)
    toast.add({ severity: 'success', summary: 'Deleted', detail: 'Lead deleted successfully', life: 3000 })
    await loadData()
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete lead', life: 5000 })
  }
}

const onDeleteSelected = async (selectedIds) => {
  try {
    await deleteLeads(selectedIds)
    toast.add({ 
      severity: 'success', 
      summary: 'Deleted', 
      detail: `Successfully deleted ${selectedIds.length} ${selectedIds.length === 1 ? 'lead' : 'leads'}`, 
      life: 3000 
    })
    await loadData()
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete selected leads', life: 5000 })
  }
}

const onShow = (leadId) => {
  showDialogLeadId.value = leadId
  showDialogVisible.value = true
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
}
</style>

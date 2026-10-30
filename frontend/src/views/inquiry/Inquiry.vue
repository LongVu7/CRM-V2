<template>
  <div class="inquiry-list-view">
    <!-- Top Breadcrumb & Title Row -->
    <div class="page-header">
      <div class="header-left">
        <div class="breadcrumb-bar">
          <span class="breadcrumb-muted">Pages</span>
          <i class="pi pi-angle-right breadcrumb-separator"></i>
          <span class="breadcrumb-active">Inquiry Management</span>
        </div>
        <div class="title-row">
          <h1><i class="pi pi-ticket"></i> Inquiry Management</h1>
          <Tag :value="`${pagination?.totalCount || 0} inquiries`" severity="info" rounded class="count-tag" />
        </div>
      </div>

      <!-- Header Actions: Quick link to Dedicated Lead Distribution View -->
      <div class="header-actions">
        <Button
          v-if="$can('distribute', 'inquiry')"
          label="Distribute Leads (Unassigned Pool)"
          icon="pi pi-share-alt"
          severity="warn"
          class="distribution-nav-btn"
          @click="$router.push('/inquiries/distribution')"
        />
      </div>
    </div>

    <!-- Main Inquiry Table View -->
    <InquiryList 
      :inquiries="inquiries"
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

    <!-- Inquiry Details Dialog -->
    <InquiryShowDialog
      v-model:visible="showDialogVisible"
      :inquiryId="showDialogInquiryId"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'

import InquiryList from '@/components/inquiry/InquiryList.vue'
import InquiryShowDialog from '@/components/inquiry/InquiryShowDialog.vue'

import { useInquiry } from '@/composables/useInquiry'
import { exportInquiries, syncGoogleSheets } from '@/services/inquiryService'

const router = useRouter()
const { inquiries, pagination, loading, fetchInquiries, deleteInquiry, deleteInquiries } = useInquiry()
const toast = useToast()

const currentParams = ref({ page: 1, limit: 20, search: '', sortField: null, sortOrder: null })

// Dialog states
const showDialogVisible = ref(false)
const showDialogInquiryId = ref(null)
const exporting = ref(false)
const syncing = ref(false)

const onEdit = (inquiryId) => {
  router.push(`/inquiries/${inquiryId}`)
}

onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  try {
    await fetchInquiries(currentParams.value)
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load inquiries', life: 5000 })
  }
}

const onPageChange = async ({ page, limit }) => {
  currentParams.value.page = page
  currentParams.value.limit = limit
  await loadData()
}

const onSort = async ({ sortField, sortOrder }) => {
  currentParams.value.sortField = sortField
  currentParams.value.sortOrder = sortOrder
  currentParams.value.page = 1
  await loadData()
}

const onSearch = async (searchQuery) => {
  currentParams.value.search = searchQuery
  currentParams.value.page = 1
  await loadData()
}

const onFilter = async (filters) => {
  currentParams.value = { ...currentParams.value, ...filters, page: 1 }
  await loadData()
}

const onDelete = async (id) => {
  try {
    await deleteInquiry(id)
    toast.add({ severity: 'success', summary: 'Deleted', detail: 'Inquiry deleted successfully', life: 3000 })
    await loadData()
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete inquiry', life: 5000 })
  }
}

const onDeleteSelected = async (selectedIds) => {
  try {
    await deleteInquiries(selectedIds)
    toast.add({ 
      severity: 'success', 
      summary: 'Deleted', 
      detail: `Successfully deleted ${selectedIds.length} ${selectedIds.length === 1 ? 'inquiry' : 'inquiries'}`, 
      life: 3000 
    })
    await loadData()
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete selected inquiries', life: 5000 })
  }
}

const onShow = (inquiryId) => {
  showDialogInquiryId.value = inquiryId
  showDialogVisible.value = true
}

const onExport = async () => {
  if (exporting.value) return
  exporting.value = true
  try {
    const data = await exportInquiries(currentParams.value)
    const url = window.URL.createObjectURL(new Blob([data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `inquiries-${new Date().toISOString().split('T')[0]}.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    toast.add({ severity: 'success', summary: 'Success', detail: 'Export downloaded successfully', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to export inquiries', life: 5000 })
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
.inquiry-list-view {
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
  .inquiry-list-view {
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

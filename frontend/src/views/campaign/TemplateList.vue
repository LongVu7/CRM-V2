<template>
  <div class="template-list-page">
    <div class="page-header">
      <h1>Campaign Templates</h1>
      <Button label="New Template" icon="pi pi-plus" @click="openTemplateForm()" />
    </div>

    <div class="filter-bar">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText v-model="filters.search" placeholder="Search templates..." @input="onSearch" />
      </IconField>

      <Select 
        v-model="filters.channel" 
        :options="channelOptions" 
        optionLabel="label" 
        optionValue="value" 
        placeholder="Filter by Channel" 
        showClear
        @change="loadData"
      />

      <Select 
        v-model="filters.status" 
        :options="statusOptions" 
        optionLabel="label" 
        optionValue="value" 
        placeholder="Filter by Status" 
        showClear
        @change="loadData"
      />
    </div>

    <div class="table-container">
      <DataTable 
        :value="templates" 
        :loading="loading" 
        dataKey="id" 
        responsiveLayout="scroll"
        lazy
        paginator
        :rows="pagination.limit"
        :totalRecords="pagination.total"
        @page="onPage"
      >
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-file"></i>
            <p>No templates found.</p>
          </div>
        </template>

        <Column field="name" header="Template Name" style="min-width: 200px">
          <template #body="{ data }">
            <span class="template-name">{{ data.name }}</span>
          </template>
        </Column>

        <Column field="channel" header="Channel" style="width: 150px">
          <template #body="{ data }">
            <Tag :value="data.channel" :severity="getChannelSeverity(data.channel)" />
          </template>
        </Column>

        <Column field="status" header="Status" style="width: 150px">
          <template #body="{ data }">
            <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
          </template>
        </Column>

        <Column field="createdAt" header="Created At" style="width: 150px">
          <template #body="{ data }">
            {{ formatDate(data.createdAt) }}
          </template>
        </Column>

        <Column header="Actions" :exportable="false" style="min-width: 120px">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="openTemplateForm(data)" />
            <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDelete(data)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Delete Confirmation -->
    <ConfirmDialog></ConfirmDialog>

    <!-- Template Form Dialog -->
    <Dialog v-model:visible="showFormDialog" :header="editingTemplate ? 'Edit Template' : 'New Template'" modal :style="{ width: '60vw' }" maximizable>
      <TemplateForm 
        v-if="showFormDialog"
        :initialData="editingTemplate" 
        @saved="handleSaved" 
        @cancel="showFormDialog = false" 
      />
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import ConfirmDialog from 'primevue/confirmdialog'
import TemplateForm from './TemplateForm.vue'
import { useCampaignTemplates } from '@/composables/useCampaignTemplates'

const toast = useToast()
const confirm = useConfirm()
const { templates, pagination, loading, fetchTemplates, removeTemplate } = useCampaignTemplates()

const filters = ref({
  search: '',
  channel: null,
  status: null
})

let searchTimeout = null

const channelOptions = [
  { label: 'Email', value: 'EMAIL' },
  { label: 'SMS', value: 'SMS' },
  { label: 'ZNS', value: 'ZNS' }
]

const statusOptions = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Archived', value: 'ARCHIVED' }
]

const showFormDialog = ref(false)
const editingTemplate = ref(null)

const loadData = async () => {
  await fetchTemplates({
    page: pagination.value.page,
    limit: pagination.value.limit,
    search: filters.value.search,
    channel: filters.value.channel,
    status: filters.value.status
  })
}

onMounted(() => {
  loadData()
})

const onSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1
    loadData()
  }, 500)
}

const onPage = (event) => {
  pagination.value.page = Math.floor(event.first / event.rows) + 1
  pagination.value.limit = event.rows
  loadData()
}

const openTemplateForm = (template = null) => {
  editingTemplate.value = template
  showFormDialog.value = true
}

const handleSaved = () => {
  showFormDialog.value = false
  loadData()
}

const confirmDelete = (template) => {
  confirm.require({
    message: `Are you sure you want to delete template "${template.name}"? If it is currently used by any campaigns, it will be Archived instead of permanently deleted.`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        const res = await removeTemplate(template.id)
        toast.add({ severity: 'success', summary: 'Success', detail: res.message || 'Template processed successfully', life: 3000 })
        loadData()
      } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.message || 'Failed to delete template', life: 3000 })
      }
    }
  })
}

const getChannelSeverity = (channel) => {
  switch (channel) {
    case 'EMAIL': return 'info'
    case 'SMS': return 'warning'
    case 'ZNS': return 'success'
    default: return 'secondary'
  }
}

const getStatusSeverity = (status) => {
  switch (status) {
    case 'ACTIVE': return 'success'
    case 'DRAFT': return 'secondary'
    case 'ARCHIVED': return 'danger'
    default: return 'info'
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString()
}
</script>

<style scoped>
.template-list-page { padding: 1.5rem 2rem; max-width: 1200px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.page-header h1 { font-size: 1.75rem; font-weight: 700; margin: 0; color: var(--p-text-color); }
.filter-bar { display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: center; flex-wrap: wrap; }
.table-container { background: var(--p-content-background); border-radius: 12px; overflow: hidden; border: 1px solid var(--p-surface-200); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); }
.empty-state { text-align: center; padding: 3rem 1rem; color: var(--p-text-muted-color); }
.empty-state i { font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; }
.template-name { font-weight: 600; }
.mr-2 { margin-right: 0.5rem; }
</style>

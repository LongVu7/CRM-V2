<template>
  <div class="section-card">
    <h2>Import from Excel</h2>

    <!-- Upload -->
    <div v-if="step === 1">
      <div class="import-info">
        <i class="pi pi-info-circle"></i>
        <p>Upload one or more Excel files (<code>.xlsx</code>, <code>.xls</code>) containing student data. The system will analyze duplicates before importing.</p>
      </div>
      <FileUpload
        name="excelFiles"
        accept=".xlsx, .xls"
        :multiple="true"
        :maxFileSize="10000000"
        chooseLabel="Choose Excel Files"
        :auto="false"
        customUpload
        ref="fileUpload"
        @uploader="onUpload"
        :disabled="isUploading"
      >
        <template #empty>
          <div class="upload-empty">
            <i class="pi pi-file-excel"></i>
            <span>Drag and drop files here to upload.</span>
          </div>
        </template>
      </FileUpload>
    </div>

    <!-- Review -->
    <div v-if="step === 2">
      <div class="review-header">
        <h3>Review Import Data</h3>
        <p>Total Records: {{ summary.total }} | Ready: {{ summary.readyNew }}</p>
      </div>

      <div class="summary-cards">
        <div class="summary-card" v-if="summary.readyNew > 0">
          <i class="pi pi-check-circle text-green-500"></i>
          <div>
            <span class="font-bold">{{ summary.readyNew }}</span> Ready (New)
          </div>
        </div>
        <div class="summary-card" v-if="summary.existingStudent > 0">
          <i class="pi pi-info-circle text-blue-500"></i>
          <div>
            <span class="font-bold">{{ summary.existingStudent }}</span> DB Duplicates (Skipped)
          </div>
        </div>
        <div class="summary-card" v-if="summary.duplicateInFile > 0">
          <i class="pi pi-copy text-orange-500"></i>
          <div>
            <span class="font-bold">{{ summary.duplicateInFile }}</span> File Duplicates (Skipped)
          </div>
        </div>
        <div class="summary-card" v-if="summary.invalid > 0 || summary.mappingIssue > 0">
          <i class="pi pi-exclamation-triangle text-red-500"></i>
          <div>
            <span class="font-bold">{{ summary.invalid + summary.mappingIssue }}</span> Invalid/Mapping Issues
          </div>
        </div>
      </div>

      <Message v-if="summary.invalid > 0 || summary.mappingIssue > 0" severity="error" :closable="false">
        There are records with validation or mapping errors. They will be skipped during import. Please check the preview table below for details.
      </Message>

      <DataTable 
        :value="previewData" 
        dataKey="_meta.rowNumber"
        :paginator="true"
        :rows="10"
        class="p-datatable-sm mt-3 review-table"
      >
        <Column field="fullName" header="Full Name" style="width: 20%"></Column>
        <Column field="mobile" header="Mobile" style="width: 15%">
          <template #body="{ data }">
            <span>{{ data.mobile || 'MISSING' }}</span>
          </template>
        </Column>
        <Column field="email" header="Email" style="width: 20%"></Column>
        <Column header="Status" style="width: 20%">
          <template #body="{ data }">
            <span v-if="data._meta.classification === 'READY_NEW'" class="status-ready"><i class="pi pi-check mr-1"></i> Ready</span>
            <span v-else-if="data._meta.classification === 'EXISTING_STUDENT'" class="status-skip"><i class="pi pi-info-circle mr-1"></i> DB Duplicate</span>
            <span v-else-if="data._meta.classification === 'DUPLICATE_IN_FILE'" class="status-skip"><i class="pi pi-copy mr-1"></i> File Duplicate</span>
            <span v-else class="status-error"><i class="pi pi-times-circle mr-1"></i> Invalid</span>
          </template>
        </Column>
        <Column header="Messages" style="width: 25%">
          <template #body="{ data }">
            <ul v-if="data._meta.errors && data._meta.errors.length" class="error-list">
              <li v-for="(err, i) in data._meta.errors" :key="i">{{ err }}</li>
            </ul>
            <span v-else class="text-muted">—</span>
          </template>
        </Column>
      </DataTable>

      <div class="action-buttons">
        <Button label="Cancel" icon="pi pi-times" severity="secondary" @click="cancelImport" />
        <Button label="Confirm Import" icon="pi pi-check" severity="success" @click="submitConfirm" :loading="isConfirming" :disabled="summary.readyNew === 0" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import FileUpload from 'primevue/fileupload'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { previewImport, confirmImport } from '@/services/studentService'

const emit = defineEmits(['cancel', 'success'])
const router = useRouter()
const toast = useToast()

const step = ref(1)
const fileUpload = ref(null)
const isUploading = ref(false)
const isConfirming = ref(false)

const importToken = ref(null)
const previewData = ref([])
const summary = ref({
  total: 0,
  readyNew: 0,
  existingStudent: 0,
  duplicateInFile: 0,
  mappingIssue: 0,
  invalid: 0
})

const onUpload = async (event) => {
  const files = event.files
  if (!files || files.length === 0) return

  isUploading.value = true
  try {
    const analysis = await previewImport(files)
    
    importToken.value = analysis.token
    summary.value = analysis.summary || summary.value
    previewData.value = analysis.preview || []
    
    step.value = 2
  } catch (error) {
    const detail = error.response?.data?.details || error.response?.data?.error || error.message || 'Upload failed'
    toast.add({ severity: 'error', summary: 'Preview Failed', detail, life: 5000 })
    if (fileUpload.value) fileUpload.value.clear()
  } finally {
    isUploading.value = false
  }
}

const cancelImport = () => {
  step.value = 1
  importToken.value = null
  previewData.value = []
  emit('cancel')
}

const submitConfirm = async () => {
  if (!importToken.value) return
  isConfirming.value = true
  try {
    const result = await confirmImport(importToken.value)
    const inserted = result.summary?.insertedCount || result.summary?.readyNew || 0
    const skipped = result.summary?.skipped || 0
    toast.add({ severity: 'success', summary: 'Import Successful', detail: `Inserted: ${inserted}, Skipped: ${skipped}`, life: 5000 })
    emit('success')
    router.push('/students')
  } catch (error) {
    const detail = error.response?.data?.details || error.response?.data?.error || error.message || 'Import failed'
    toast.add({ severity: 'error', summary: error.response?.data?.error || 'Import Failed', detail, life: 5000 })
  } finally {
    isConfirming.value = false
  }
}
</script>

<style scoped>
.section-card {
  background: var(--p-content-background);
  border: 1px solid var(--p-surface-200);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.section-card h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1.25rem 0;
  color: var(--p-text-color);
}

.import-info {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--p-blue-50);
  border-radius: 8px;
  margin-bottom: 1rem;
  border: 1px solid var(--p-blue-200);
}

.import-info i {
  color: var(--p-blue-500);
  font-size: 1.25rem;
  margin-top: 0.1rem;
}

.import-info p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
}

.import-info code {
  background: var(--p-blue-100);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.upload-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1rem;
  gap: 0.5rem;
  color: var(--p-text-muted-color);
}

.upload-empty i {
  font-size: 2rem;
  color: var(--p-green-400);
}

.review-header {
  margin-bottom: 1rem;
}

.review-header h3 {
  margin: 0 0 0.5rem 0;
}

.review-header p {
  margin: 0;
  color: var(--p-text-muted-color);
  font-weight: 500;
}

.summary-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 6px;
  font-size: 0.9rem;
}

.status-ready { color: var(--p-green-600); font-weight: 600; font-size: 0.85rem; }
.status-skip { color: var(--p-orange-500); font-weight: 600; font-size: 0.85rem; }
.status-error { color: #ef4444; font-weight: 600; font-size: 0.85rem; }
.text-muted { color: var(--p-text-muted-color); }
.font-bold { font-weight: bold; }
.mr-1 { margin-right: 0.25rem; }

.error-list {
  margin: 0;
  padding-left: 1.2rem;
  font-size: 0.8rem;
  color: #ef4444;
}

.action-buttons {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
</style>

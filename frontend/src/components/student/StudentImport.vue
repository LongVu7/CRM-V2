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
        <p>Total Records: {{ parsedData.length }} | Duplicates Detected: {{ duplicateCount }}</p>
      </div>

      <Message v-if="duplicateCount > 0" severity="warn" :closable="false">
        Found {{ duplicateCount }} duplicate(s) based on mobile numbers. Records with existing database mobiles will be updated. Be careful with duplicates within the uploaded files themselves. Click on a mobile number to edit it.
      </Message>

      <Message v-if="schoolWarnings.length > 0" severity="warn" :closable="false">
        {{ schoolWarnings.length }} student(s) had school lookup issues:
        <ul style="margin: 0.5rem 0 0 1rem; padding: 0;">
          <li v-for="(w, i) in schoolWarnings" :key="i" style="font-size: 0.85rem;">Row {{ w.rowNumber }} ({{ w.fullName }}): {{ w.message }}</li>
        </ul>
      </Message>

      <DataTable 
        :value="parsedData" 
        dataKey="mobile"
        editMode="cell"
        @cell-edit-complete="onCellEditComplete"
        :paginator="true"
        :rows="10"
        class="p-datatable-sm mt-3 review-table"
      >
        <Column field="fullName" header="Full Name" style="width: 25%"></Column>
        <Column field="mobile" header="Mobile" style="width: 25%">
          <template #editor="{ data, field }">
            <InputText v-model="data[field]" autofocus />
          </template>
          <template #body="{ data }">
            <span :class="{'duplicate-text': isDuplicate(data.mobile)}">
              {{ data.mobile || 'MISSING' }}
              <i v-if="isDuplicate(data.mobile)" class="pi pi-exclamation-triangle ml-1" title="Duplicate Mobile"></i>
            </span>
          </template>
        </Column>
        <Column field="email" header="Email" style="width: 20%"></Column>
        <Column header="School" style="width: 15%">
          <template #body="{ data }">
            <span v-if="data.schoolId" class="school-resolved">{{ data.school || `ID: ${data.schoolId}` }}</span>
            <span v-else-if="data.school" class="school-unresolved">{{ data.school }} <i class="pi pi-exclamation-circle" title="School not found"></i></span>
            <span v-else style="color: var(--p-text-muted-color)">—</span>
          </template>
        </Column>
        <Column field="_mapping.fileName" header="Source File" style="width: 20%"></Column>
        <Column header="Actions" style="width: 5%">
          <template #body="{ index }">
            <Button icon="pi pi-trash" severity="danger" text rounded aria-label="Cancel" @click="removeRow(index)" />
          </template>
        </Column>
      </DataTable>

      <div class="action-buttons">
        <Button label="Cancel" icon="pi pi-times" severity="secondary" @click="cancelImport" />
        <Button label="Confirm Import" icon="pi pi-check" severity="success" @click="submitConfirm" :loading="isConfirming" />
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
import InputText from 'primevue/inputtext'
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

const parsedData = ref([])
const duplicates = ref([])
const duplicateCount = ref(0)
const schoolWarnings = ref([])

const onUpload = async (event) => {
  const files = event.files
  if (!files || files.length === 0) return

  isUploading.value = true
  try {
    const analysis = await previewImport(files)
    
    parsedData.value = analysis.parsedStudents || []
    duplicates.value = analysis.duplicates || []
    duplicateCount.value = analysis.duplicateCount || 0
    schoolWarnings.value = analysis.schoolWarnings || []
    
    step.value = 2
  } catch (error) {
    const detail = error.response?.data?.details || error.response?.data?.error || error.message || 'Upload failed'
    toast.add({ severity: 'error', summary: 'Preview Failed', detail, life: 5000 })
    if (fileUpload.value) fileUpload.value.clear()
  } finally {
    isUploading.value = false
  }
}

const onCellEditComplete = (event) => {
  let { data, newValue, field } = event
  if (newValue !== null && newValue.trim().length > 0) {
    data[field] = newValue.trim()
  } else {
    event.preventDefault()
  }
}

const isDuplicate = (mobile) => {
  if (!mobile) return false
  return duplicates.value.some(d => d.mobile === mobile)
}

const removeRow = (index) => {
  parsedData.value.splice(index, 1)
}

const cancelImport = () => {
  step.value = 1
  parsedData.value = []
  duplicates.value = []
  duplicateCount.value = 0
  emit('cancel')
}

const submitConfirm = async () => {
  isConfirming.value = true
  try {
    const result = await confirmImport(parsedData.value)
    toast.add({ severity: 'success', summary: 'Import Successful', detail: `Inserted: ${result.insertedCount}, Updated: ${result.updatedCount}`, life: 5000 })
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

.duplicate-text {
  color: #ef4444;
  font-weight: bold;
}

.action-buttons {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.ml-1 {
  margin-left: 0.25rem;
}
.mt-3 {
  margin-top: 1rem;
}
.school-resolved {
  color: var(--p-green-600);
  font-size: 0.85rem;
}
.school-unresolved {
  color: #ef4444;
  font-size: 0.85rem;
}
</style>

<template>
  <div class="lead-import-view">
    <div class="page-header">
      <div class="header-left">
        <div class="breadcrumb-bar">
          <RouterLink to="/leads" class="breadcrumb-link">
            <i class="pi pi-ticket"></i> Leads
          </RouterLink>
          <i class="pi pi-angle-right breadcrumb-separator"></i>
          <span class="breadcrumb-active">Import Data</span>
        </div>
        <div class="title-row">
          <h1><i class="pi pi-file-excel"></i> Import Leads from Excel</h1>
        </div>
      </div>
      <Button 
        label="Back to List" 
        severity="secondary" 
        icon="pi pi-arrow-left" 
        @click="router.push('/leads')" 
      />
    </div>

    <div class="section-card">
      <!-- Stepper Indicator -->
      <div class="stepper-indicator">
        <div class="step-node" :class="{ active: step === 1, completed: step > 1 }">
          <div class="step-icon">
            <i v-if="step > 1" class="pi pi-check"></i>
            <span v-else>1</span>
          </div>
          <div class="step-text">
            <span class="step-num">Step 1</span>
            <span class="step-name">Upload File</span>
          </div>
        </div>

        <div class="step-connector" :class="{ completed: step > 1 }"></div>

        <div class="step-node" :class="{ active: step === 2, completed: step > 2 }">
          <div class="step-icon">
            <i v-if="step > 2" class="pi pi-check"></i>
            <span v-else>2</span>
          </div>
          <div class="step-text">
            <span class="step-num">Step 2</span>
            <span class="step-name">Review & Validate</span>
          </div>
        </div>

        <div class="step-connector" :class="{ completed: step > 2 }"></div>

        <div class="step-node" :class="{ active: step === 3, completed: step === 3 }">
          <div class="step-icon">
            <i v-if="step === 3" class="pi pi-check-circle"></i>
            <span v-else>3</span>
          </div>
          <div class="step-text">
            <span class="step-num">Step 3</span>
            <span class="step-name">Import Result</span>
          </div>
        </div>
      </div>

      <div class="header-container">
        <h2>
          <span v-if="step === 1">Upload Lead Excel File</span>
          <span v-else-if="step === 2">Review & Verify Data Before Import</span>
          <span v-else>Import Completed</span>
        </h2>
        <Button 
          v-if="step === 1"
          label="Download Official Template" 
          icon="pi pi-download" 
          severity="info" 
          size="small"
          @click="downloadLeadTemplate" 
        />
      </div>

      <!-- Step 1: Upload -->
      <LeadImportUpload 
        v-if="step === 1" 
        ref="uploadRef"
        :isUploading="isUploading"
        @upload="handleUpload"
      />

      <!-- Step 2: Review -->
      <LeadImportReview 
        v-if="step === 2"
        :summary="summary"
        :parsedData="parsedData"
        :isConfirming="isConfirming"
        :canConfirm="canConfirm"
        @cancel="handleCancel"
        @confirm="handleConfirm"
      />

      <!-- Step 3: Result -->
      <LeadImportResult 
        v-if="step === 3"
        :resultStats="resultStats"
        @reset="handleCancel"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { downloadLeadTemplate, previewImportLead, confirmImportLead } from '@/services/leadService'

import LeadImportUpload from '@/components/lead/LeadImportUpload.vue'
import LeadImportReview from '@/components/lead/LeadImportReview.vue'
import LeadImportResult from '@/components/lead/LeadImportResult.vue'

const router = useRouter()
const toast = useToast()

const step = ref(1)
const uploadRef = ref(null)

// State
const isUploading = ref(false)
const isConfirming = ref(false)
const importToken = ref(null)
const summary = ref({})
const parsedData = ref([])
const resultStats = ref({})

const canConfirm = computed(() => {
  return (summary.value.ready || 0) > 0
})

const handleUpload = async (file) => {
  isUploading.value = true
  try {
    const response = await previewImportLead(file)
    importToken.value = response.data.importToken
    summary.value = response.data.summary
    parsedData.value = response.data.rows
    step.value = 2
  } catch (error) {
    const detail = error.response?.data?.error || error.message || 'Upload failed'
    toast.add({ severity: 'error', summary: 'Preview Failed', detail, life: 5000 })
    if (uploadRef.value) uploadRef.value.clear()
  } finally {
    isUploading.value = false
  }
}

const handleConfirm = async () => {
  if (!importToken.value) return
  isConfirming.value = true
  try {
    const response = await confirmImportLead(importToken.value)
    resultStats.value = response.data
    toast.add({ severity: 'success', summary: 'Import Successful', detail: 'Processed successfully', life: 5000 })
    step.value = 3
  } catch (error) {
    const detail = error.response?.data?.error || error.message || 'Import failed'
    toast.add({ severity: 'error', summary: 'Import Failed', detail, life: 5000 })
  } finally {
    isConfirming.value = false
  }
}

const handleCancel = () => {
  step.value = 1
  importToken.value = null
  parsedData.value = []
  summary.value = {}
  resultStats.value = {}
  if (uploadRef.value) uploadRef.value.clear()
}
</script>

<style scoped>
.lead-import-view {
  padding: 1.5rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.breadcrumb-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.breadcrumb-link {
  color: var(--p-text-muted-color);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: color 0.2s;
}

.breadcrumb-link:hover {
  color: var(--p-primary-color);
}

.breadcrumb-separator {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.breadcrumb-active {
  color: var(--p-primary-color);
  font-weight: 600;
}

.title-row h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-color);
}

.title-row h1 i {
  color: #10b981;
}

.section-card {
  background: var(--p-content-background);
  border: 1px solid var(--p-surface-200);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.header-container h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: var(--p-text-color);
}

/* Stepper Indicator */
.stepper-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding: 1rem 1.5rem;
  background: var(--p-surface-50);
  border-radius: 10px;
  border: 1px solid var(--p-surface-200);
}

.step-node {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  opacity: 0.6;
  transition: all 0.2s ease;
}

.step-node.active,
.step-node.completed {
  opacity: 1;
}

.step-icon {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  background: var(--p-surface-200);
  color: var(--p-text-muted-color);
  transition: all 0.2s ease;
}

.step-node.active .step-icon {
  background: var(--p-primary-color);
  color: #fff;
  box-shadow: 0 0 0 4px var(--p-primary-100, rgba(59, 130, 246, 0.2));
}

.step-node.completed .step-icon {
  background: #10b981;
  color: #fff;
}

.step-text {
  display: flex;
  flex-direction: column;
}

.step-num {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--p-text-muted-color);
}

.step-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.step-connector {
  flex: 1;
  height: 2px;
  background: var(--p-surface-200);
  margin: 0 1rem;
  transition: background 0.3s ease;
}

.step-connector.completed {
  background: #10b981;
}

@media (max-width: 640px) {
  .stepper-indicator {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  .step-connector {
    display: none;
  }
}
</style>

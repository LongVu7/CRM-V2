<template>
  <div class="section-card">
    <div class="header-container">
      <h2>Import Inquiry from Excel</h2>
      <Button 
        v-if="step === 1"
        label="Download Official Template" 
        icon="pi pi-download" 
        severity="info" 
        size="small"
        @click="downloadInquiryTemplate" 
      />
    </div>

    <!-- Step 1: Upload -->
    <InquiryImportUpload 
      v-if="step === 1" 
      ref="uploadRef"
      :isUploading="isUploading"
      @upload="handleUpload"
    />

    <!-- Step 2: Review -->
    <InquiryImportReview 
      v-if="step === 2"
      :summary="summary"
      :parsedData="parsedData"
      :isConfirming="isConfirming"
      :canConfirm="canConfirm"
      @cancel="handleCancel"
      @confirm="handleConfirm"
    />

    <!-- Step 3: Result -->
    <InquiryImportResult 
      v-if="step === 3"
      :resultStats="resultStats"
      @reset="handleCancel"
    />
  </div>
</template>

  <script setup>
  import { ref, computed } from 'vue'
  import Button from 'primevue/button'
  import { useToast } from 'primevue/usetoast'
  import { downloadInquiryTemplate, previewImportInquiry, confirmImportInquiry } from '@/services/inquiryService'
  
  import InquiryImportUpload from './InquiryImportUpload.vue'
  import InquiryImportReview from './InquiryImportReview.vue'
  import InquiryImportResult from './InquiryImportResult.vue'
  
  const emit = defineEmits(['imported'])
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
    return (summary.value.readyNew || 0) > 0 || (summary.value.readyExisting || 0) > 0
  })
  
  const handleUpload = async (file) => {
    isUploading.value = true
    try {
      const response = await previewImportInquiry(file)
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
      const response = await confirmImportInquiry(importToken.value)
      resultStats.value = response.data
      toast.add({ severity: 'success', summary: 'Import Successful', detail: 'Processed successfully', life: 5000 })
      step.value = 3
      emit('imported')
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
</style>

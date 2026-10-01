<template>
  <div class="inquiry-new-view">
    <div class="page-header">
      <h1>Create New Inquiry</h1>
      <Button 
        label="Back to List" 
        severity="secondary" 
        icon="pi pi-arrow-left" 
        @click="$router.push('/inquiries')" 
      />
    </div>

    <div class="cards-container">
      <InquiryStudentAssign ref="studentAssignRef" />
      <div class="section-card">
        <div class="card-header">
          <h2><i class="pi pi-info-circle"></i> Inquiry Details</h2>
        </div>
        <InquiryForm v-model="inquiryForm" />
      </div>

        
      <InquiryAccountAssign ref="accountAssignRef" />
    </div>

    <InquiryImport />

    <div class="global-actions">
      <Button 
        label="Create Inquiry" 
        icon="pi pi-check" 
        size="large" 
        @click="submitGlobal" 
        :loading="isSubmitting" 
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useInquiry } from '@/composables/useInquiry'
import InquiryForm from '@/components/inquiry/InquiryForm.vue'
import InquiryStudentAssign from '@/components/inquiry/InquiryStudentAssign.vue'
import InquiryAccountAssign from '@/components/inquiry/InquiryAccountAssign.vue'
import InquiryImport from '@/components/inquiry/InquiryImport.vue'

const router = useRouter()
const toast = useToast()
const { createInquiry } = useInquiry()

const studentAssignRef = ref(null)
const accountAssignRef = ref(null)

const inquiryForm = ref({
  statusDataId: null,
  description: '',
  dataReceived: null,
  sourceDataId: null
})

const isSubmitting = ref(false)

const submitGlobal = async () => {
  // Validate Student Form if creating inline
  const studentData = studentAssignRef.value.validateAndGetPayload()
  if (!studentData.isValid) {
    toast.add({ severity: 'error', summary: 'Validation Error', detail: 'Please fill out required student fields', life: 3000 })
    return
  }

  // Build Inquiry Payload
  const payload = {}
  for (const [key, value] of Object.entries(inquiryForm.value)) {
    if (value !== '' && value !== null && value !== undefined) {
      payload[key] = value
    }
  }

  if (studentData.isCreating && studentData.studentPayload) {
    payload.student = studentData.studentPayload
  } else if (!studentData.isCreating && studentData.studentId) {
    payload.studentId = studentData.studentId
  }

  const accountId = accountAssignRef.value.getPayload()
  if (accountId) {
    payload.assignedToId = accountId
  }

  isSubmitting.value = true
  try {
    await createInquiry(payload)
    toast.add({ severity: 'success', summary: 'Created', detail: 'Inquiry created successfully', life: 3000 })
    router.push('/inquiries')
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: error.response?.data?.error || error.response?.data?.details || error.message, life: 5000 })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.inquiry-new-view { padding: 1.5rem 2rem; max-width: 1000px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--p-text-color); }
.cards-container { display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2rem; }
.section-card { 
  background: var(--p-content-background); 
  border: 1px solid var(--p-surface-200); 
  border-radius: 12px; 
  padding: 1.5rem; 
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); 
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--p-surface-100);
  padding-bottom: 0.75rem;
}
.card-header h2 {
  font-size: 1.15rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-color);
}
.card-header h2 i {
  color: var(--p-primary-color);
}
.global-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--p-surface-200);
}
</style>

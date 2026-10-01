<template>
  <div class="inquiry-detail-view">
    <div class="page-header">
      <h1>Edit Inquiry #{{ $route.params.id }}</h1>
      <Button label="Back to List" severity="secondary" icon="pi pi-arrow-left" @click="$router.push('/inquiries')" />
    </div>

    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <p>Loading inquiry...</p>
    </div>

    <div v-else-if="notFound" class="empty-state">
      <i class="pi pi-exclamation-triangle"></i>
      <h3>Inquiry Not Found</h3>
      <Button label="Back to List" icon="pi pi-arrow-left" @click="$router.push('/inquiries')" />
    </div>

    <div v-else class="cards-container">
      <div class="section-card">
        <div class="card-header">
          <h2><i class="pi pi-info-circle"></i> Inquiry Details</h2>
        </div>
        <InquiryForm v-model="inquiryForm" :initialSourceDataId="initialSourceDataId" :initialStatusDataId="initialStatusDataId" />
      </div>

      <InquiryStudentAssign ref="studentAssignRef" :initialStudent="linkedStudent"
        @remove-student="handleRemoveStudent" />

      <InquiryAccountAssign ref="accountAssignRef" :initialAccount="selectedStaff" />

      <div class="global-actions">
        <Button label="Update Inquiry" icon="pi pi-check" size="large" @click="submitGlobal" :loading="isSubmitting" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useInquiry } from '@/composables/useInquiry'
import { useStudent } from '@/composables/useStudent'
import InquiryForm from '@/components/inquiry/InquiryForm.vue'
import InquiryStudentAssign from '@/components/inquiry/InquiryStudentAssign.vue'
import InquiryAccountAssign from '@/components/inquiry/InquiryAccountAssign.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const { fetchInquiryById, updateInquiry, assignStudent, unassignStudent } = useInquiry()
const { createStudent } = useStudent()

const studentAssignRef = ref(null)
const accountAssignRef = ref(null)

const inquiryForm = ref({})
const linkedStudent = ref(null)
const selectedStaff = ref(null)

const loading = ref(true)
const notFound = ref(false)
const isSubmitting = ref(false)
const initialSourceDataId = ref(null)
const initialStatusDataId = ref(null)

onMounted(async () => {
  try {
    const data = await fetchInquiryById(route.params.id)
    inquiryForm.value = {
      statusDataId: data.statusDataId || null,
      description: data.description || '',
      dataReceived: data.dataReceived ? new Date(data.dataReceived) : null,
      sourceDataId: data.sourceDataId || null
    }
    initialSourceDataId.value = data.sourceDataId || null
    initialStatusDataId.value = data.statusDataId || null
    linkedStudent.value = data.student || null
    if (data.assignedTo) {
      selectedStaff.value = data.assignedTo
    }
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
})

const submitGlobal = async () => {
  // Validate student assignment section
  const studentData = studentAssignRef.value.validateAndGetPayload()
  if (!studentData.isValid) {
    toast.add({ severity: 'error', summary: 'Validation Error', detail: 'Please fill out required student fields', life: 3000 })
    return
  }

  // Build inquiry payload — include null for nullable fields so backend can clear them
  const payload = {}
  const nullableFields = ['statusDataId', 'sourceDataId', 'dataReceived', 'groupTele']
  for (const [key, value] of Object.entries(inquiryForm.value)) {
    if (value !== '' && value !== null && value !== undefined) {
      payload[key] = value
    } else if (nullableFields.includes(key)) {
      payload[key] = null
    }
  }

  const accountId = accountAssignRef.value.getPayload()
  payload.assignedToId = accountId

  isSubmitting.value = true
  try {
    const inquiryId = route.params.id

    // 1. Update inquiry fields
    await updateInquiry(inquiryId, payload)

    // 2. Handle student assignment
    if (studentData.isCreating && studentData.studentPayload) {
      // Create new student, then assign to inquiry
      const created = await createStudent(studentData.studentPayload)
      await assignStudent(inquiryId, created.student.id)
    } else if (!studentData.isCreating && studentData.studentId) {
      // Assign existing student to inquiry
      await assignStudent(inquiryId, studentData.studentId)
    }

    toast.add({ severity: 'success', summary: 'Updated', detail: 'Inquiry updated successfully', life: 3000 })
    router.push('/inquiries')
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: error.response?.data?.error || error.response?.data?.details || error.message, life: 5000 })
  } finally {
    isSubmitting.value = false
  }
}

const handleRemoveStudent = async (studentId) => {
  try {
    await unassignStudent(route.params.id, studentId)
    linkedStudent.value = null
    toast.add({ severity: 'success', summary: 'Removed', detail: 'Student unassigned successfully', life: 3000 })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: error.response?.data?.error || error.response?.data?.details || error.message, life: 5000 })
  }
}
</script>

<style scoped>
.inquiry-detail-view {
  padding: 1.5rem 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--p-text-color);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem;
  gap: 0.75rem;
  color: var(--p-text-muted-color);
}

.empty-state i {
  font-size: 3rem;
  color: var(--p-orange-400);
}

.empty-state h3 {
  margin: 0 0 1rem 0;
  color: var(--p-text-color);
}

.cards-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

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

<template>
  <div class="inquiry-detail-view">
    <div class="page-header">
      <h1>Edit Inquiry #{{ $route.params.id }}</h1>
      <div class="header-actions">
        <Button
          label="Status History"
          icon="pi pi-history"
          severity="secondary"
          outlined
          @click="statusHistoryDialogVisible = true"
        />
        <Button label="Back to List" severity="secondary" icon="pi pi-arrow-left" @click="$router.push('/inquiries')" />
      </div>
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
        <InquiryForm
          v-model="inquiryForm"
          :initialSourceDataId="initialSourceDataId"
          :initialStatusDataId="initialStatusDataId"
        />
      </div>

      <InquiryStudentAssign ref="studentAssignRef" :initialStudent="linkedStudent"
        @remove-student="handleRemoveStudent" />

      <InquiryAccountAssign ref="accountAssignRef" :initialAccount="selectedStaff" />

      <div class="section-card">
        <div class="card-header flex justify-between items-center">
          <h2><i class="pi pi-history"></i> Status History</h2>
          <Button
            label="Open Dialog"
            icon="pi pi-window-maximize"
            text
            size="small"
            @click="statusHistoryDialogVisible = true"
          />
        </div>
        <InquiryStatusTimeline :inquiryId="$route.params.id" />
      </div>

      <div class="global-actions">
        <Button label="Update Inquiry" icon="pi pi-check" size="large" @click="submitGlobal" :loading="isSubmitting" />
      </div>
    </div>

    <!-- Status History Dialog -->
    <InquiryStatusHistoryDialog
      v-model:visible="statusHistoryDialogVisible"
      :inquiryId="$route.params.id"
    />

    <!-- Status Change Notes Modal Dialog -->
    <Dialog
      v-model:visible="statusNotesDialogVisible"
      header="Status Change Notes"
      modal
      :style="{ width: '500px' }"
      :closable="true"
    >
      <div class="status-notes-modal-body">
        <p class="modal-hint">
          <i class="pi pi-info-circle text-primary"></i>
          The inquiry's status has been modified. Would you like to add remarks or notes for this status transition?
        </p>
        <div class="form-field mt-3">
          <label for="statusNotesTextarea" class="block font-medium text-sm mb-1">Remarks / Notes (Optional)</label>
          <Textarea
            id="statusNotesTextarea"
            v-model="transitionNotes"
            rows="4"
            placeholder="Enter details, reason, or appointment info for this status change..."
            class="w-full"
            :maxlength="2000"
            autoResize
          />
          <small class="text-xs text-muted block text-right mt-1">{{ transitionNotes?.length || 0 }} / 2000</small>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" text @click="statusNotesDialogVisible = false" />
        <Button label="Skip & Update" severity="secondary" outlined @click="handleSkipNotesAndUpdate" :loading="isSubmitting" />
        <Button label="Save Notes & Update" icon="pi pi-check" @click="handleSaveNotesAndUpdate" :loading="isSubmitting" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import { useInquiry } from '@/composables/useInquiry'
import { useStudent } from '@/composables/useStudent'
import InquiryForm from '@/components/inquiry/InquiryForm.vue'
import InquiryStudentAssign from '@/components/inquiry/InquiryStudentAssign.vue'
import InquiryAccountAssign from '@/components/inquiry/InquiryAccountAssign.vue'
import InquiryStatusTimeline from '@/components/inquiry/InquiryStatusTimeline.vue'
import InquiryStatusHistoryDialog from '@/components/inquiry/InquiryStatusHistoryDialog.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const { fetchInquiryById, updateInquiry, assignStudent, unassignStudent } = useInquiry()
const { createStudent } = useStudent()

const statusHistoryDialogVisible = ref(false)

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

const statusNotesDialogVisible = ref(false)
const transitionNotes = ref('')
let pendingStudentData = null

const handleSkipNotesAndUpdate = async () => {
  statusNotesDialogVisible.value = false
  await executeUpdate(pendingStudentData, null)
}

const handleSaveNotesAndUpdate = async () => {
  const notes = transitionNotes.value ? transitionNotes.value.trim() : null
  statusNotesDialogVisible.value = false
  await executeUpdate(pendingStudentData, notes)
}

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

  // Check if user changed the status fields
  const currentStatusId = inquiryForm.value.statusDataId || null
  const prevStatusId = initialStatusDataId.value || null
  const statusChanged = currentStatusId !== prevStatusId

  if (statusChanged) {
    pendingStudentData = studentData
    transitionNotes.value = ''
    statusNotesDialogVisible.value = true
    return
  }

  // If status did not change, proceed directly with update
  await executeUpdate(studentData, null)
}

const executeUpdate = async (studentData, notes = null) => {
  // Build inquiry payload — include null for nullable fields so backend can clear them
  const payload = {}
  const nullableFields = ['statusDataId', 'sourceDataId', 'dataReceived']
  for (const [key, value] of Object.entries(inquiryForm.value)) {
    if (value !== '' && value !== null && value !== undefined && key !== 'statusNotes') {
      payload[key] = value
    } else if (nullableFields.includes(key)) {
      payload[key] = null
    }
  }

  if (notes) {
    payload.statusNotes = notes
  }

  const accountId = accountAssignRef.value?.getPayload ? accountAssignRef.value.getPayload() : undefined
  if (accountId !== undefined) {
    payload.assignedToId = accountId
  }

  isSubmitting.value = true
  try {
    const inquiryId = route.params.id

    // 1. Update inquiry fields
    await updateInquiry(inquiryId, payload)

    // 2. Handle student assignment
    if (studentData?.isCreating && studentData?.studentPayload) {
      // Create new student, then assign to inquiry
      const created = await createStudent(studentData.studentPayload)
      await assignStudent(inquiryId, created.student.id)
    } else if (!studentData?.isCreating && studentData?.studentId) {
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}



.modal-hint {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  line-height: 1.4;
  margin-bottom: 0.5rem;
}
</style>

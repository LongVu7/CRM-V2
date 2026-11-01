<template>
  <div class="lead-detail-view">
    <div class="page-header">
      <h1>Edit Lead #{{ $route.params.id }}</h1>
      <div class="header-actions flex gap-2 align-items-center">
        <!-- Voice Call Button / SplitButton -->
        <template v-if="callReadiness.canCall">
          <SplitButton v-if="phoneMenuItems.length > 1" label="Call Contact" icon="pi pi-phone" severity="success"
            :model="phoneMenuItems" @click="handlePrimaryCall" />
          <Button v-else label="Call Contact" icon="pi pi-phone" severity="success" @click="handlePrimaryCall" />
        </template>
        <span v-else v-tooltip.top="callReadiness.message || 'Call unavailable'">
          <Button label="Call Contact" icon="pi pi-phone" severity="secondary" disabled />
        </span>

        <Button label="Status History" icon="pi pi-history" severity="secondary" outlined
          @click="statusHistoryDialogVisible = true" />
        <Button label="Back to List" severity="secondary" icon="pi pi-arrow-left" @click="$router.push('/leads')" />
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <p>Loading lead...</p>
    </div>

    <div v-else-if="notFound" class="empty-state">
      <i class="pi pi-exclamation-triangle"></i>
      <h3>Lead Not Found</h3>
      <Button label="Back to List" icon="pi pi-arrow-left" @click="$router.push('/leads')" />
    </div>

    <div v-else class="cards-container">
      <div class="section-card">
        <LeadForm ref="leadFormRef" :initialLead="leadRecord" />
      </div>

      <div class="section-card">
        <div class="card-header flex justify-between items-center">
          <h2><i class="pi pi-history"></i> Status History</h2>
        </div>
        <LeadStatusTimeline :leadId="$route.params.id" />
      </div>

      <LeadAccountAssign ref="accountAssignRef" :initialAccount="selectedStaff" />

      <div class="global-actions">
        <Button label="Update Lead" icon="pi pi-check" size="large" @click="submitGlobal" :loading="isSubmitting" />
      </div>
    </div>

    <!-- Voice Call Dialog -->
    <LeadCallDialog v-model:visible="callDialogVisible" :leadId="$route.params.id"
      :student="callReadiness.student || leadRecord?.student || leadRecord" :targetPhone="selectedTargetPhone"
      @call-completed="handleCallCompleted" />

    <!-- Status History Dialog -->
    <LeadStatusHistoryDialog v-model:visible="statusHistoryDialogVisible" :leadId="$route.params.id" />

    <!-- Status Change Notes Modal Dialog -->
    <Dialog v-model:visible="statusNotesDialogVisible" header="Status Change Notes" modal :style="{ width: '500px' }"
      :closable="true">
      <div class="status-notes-modal-body">
        <p class="modal-hint">
          <i class="pi pi-info-circle text-primary"></i>
          The lead's status has been modified. Would you like to add remarks or notes for this status transition?
        </p>
        <div class="form-field mt-3">
          <label for="statusNotesTextarea" class="block font-medium text-sm mb-1">Remarks / Notes (Optional)</label>
          <Textarea id="statusNotesTextarea" v-model="transitionNotes" rows="4"
            placeholder="Enter details, reason, or appointment info for this status change..." class="w-full"
            :maxlength="2000" autoResize />
          <small class="text-xs text-muted block text-right mt-1">{{ transitionNotes?.length || 0 }} / 2000</small>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" text @click="statusNotesDialogVisible = false" />
        <Button label="Skip & Update" outlined @click="handleSkipNotesAndUpdate" :loading="isSubmitting" />
        <Button label="Save Notes & Update" icon="pi pi-check" @click="handleSaveNotesAndUpdate"
          :loading="isSubmitting" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Button from 'primevue/button'
import SplitButton from 'primevue/splitbutton'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import { useLead } from '@/composables/useLead'
import { checkCallReadiness } from '@/services/voipService'
import { useStringee } from '@/composables/useStringee'
import LeadForm from '@/components/lead/LeadForm.vue'
import LeadAccountAssign from '@/components/lead/LeadAccountAssign.vue'
import LeadStatusTimeline from '@/components/lead/LeadStatusTimeline.vue'
import LeadStatusHistoryDialog from '@/components/lead/LeadStatusHistoryDialog.vue'
import LeadCallDialog from '@/components/lead/LeadCallDialog.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const { fetchLeadById, updateLead } = useLead()
const { makeCall, callState } = useStringee()

const statusHistoryDialogVisible = ref(false)

const leadFormRef = ref(null)
const accountAssignRef = ref(null)

const leadRecord = ref(null)
const selectedStaff = ref(null)

const loading = ref(true)
const notFound = ref(false)
const isSubmitting = ref(false)
const initialStatusDataId = ref(null)

const statusNotesDialogVisible = ref(false)
const transitionNotes = ref('')
let pendingPayload = null

// Voice Calling State
const callDialogVisible = ref(false)
const callReadiness = ref({ canCall: false, reason: null, message: '' })
const selectedTargetPhone = ref('')
const selectedTargetUserId = ref('')

const loadCallReadiness = async () => {
  try {
    const res = await checkCallReadiness(route.params.id)
    callReadiness.value = res
  } catch (err) {
    callReadiness.value = {
      canCall: false,
      reason: err.response?.data?.reason || 'ERROR',
      message: err.response?.data?.message || 'Unable to check call readiness'
    }
  }
}

const phoneMenuItems = computed(() => {
  const items = []
  const st = callReadiness.value?.student || leadRecord.value
  const primary = st?.primaryPhone || st?.mobile
  const other = st?.otherPhone
  if (primary) {
    items.push({
      label: `Mobile: ${primary}`,
      icon: 'pi pi-phone',
      command: () => initiateCall(primary, st?.normalizedPhone || primary)
    })
  }
  if (other) {
    items.push({
      label: `Other: ${other}`,
      icon: 'pi pi-mobile',
      command: () => initiateCall(other, st?.normalizedOtherPhone || other)
    })
  }
  return items
})

const initiateCall = async (phone, normalizedTarget) => {
  selectedTargetPhone.value = phone
  selectedTargetUserId.value = normalizedTarget
  callDialogVisible.value = true
  try {
    await makeCall({
      leadId: route.params.id,
      studentId: callReadiness.value?.student?.id || leadRecord.value?.studentId,
      calleeId: normalizedTarget,
      destinationNumber: phone
    })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Call Failed',
      detail: err.message || 'Could not initiate voice call',
      life: 5000
    })
  }
}

const handlePrimaryCall = () => {
  const st = callReadiness.value?.student || leadRecord.value
  const phone = st?.primaryPhone || st?.mobile || st?.otherPhone
  const normalized = st?.normalizedPhone || st?.mobile || st?.normalizedOtherPhone || phone
  if (phone && normalized) {
    initiateCall(phone, normalized)
  }
}

const handleCallCompleted = () => {
  toast.add({
    severity: 'info',
    summary: 'Call Concluded',
    detail: 'Call record saved to Call History.',
    life: 3000
  })
}

const handleBeforeUnload = (e) => {
  if (['calling', 'ringing', 'connected'].includes(callState.value)) {
    e.preventDefault()
    e.returnValue = ''
  }
}

const handleSkipNotesAndUpdate = async () => {
  statusNotesDialogVisible.value = false
  await executeUpdate(pendingPayload, null)
}

const handleSaveNotesAndUpdate = async () => {
  const notes = transitionNotes.value ? transitionNotes.value.trim() : null
  statusNotesDialogVisible.value = false
  await executeUpdate(pendingPayload, notes)
}

onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  try {
    const data = await fetchLeadById(route.params.id)
    leadRecord.value = data
    initialStatusDataId.value = data.statusDataId || null
    if (data.assignedTo) {
      selectedStaff.value = data.assignedTo
    }
    loadCallReadiness()
  } catch (err) {
    console.error('Failed to load lead detail:', err)
    notFound.value = true
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

const submitGlobal = async () => {
  if (!leadFormRef.value?.validate()) {
    const errorMsg = leadFormRef.value?.getFirstError?.() || 'Please check all required fields and formats'
    toast.add({ severity: 'error', summary: 'Validation Error', detail: errorMsg, life: 4000 })
    return
  }

  const payload = leadFormRef.value.getPayload()
  const accountId = accountAssignRef.value?.getPayload ? accountAssignRef.value.getPayload() : undefined
  if (accountId !== undefined) {
    payload.assignedToId = accountId
  }

  // Check if user changed status to trigger transition notes dialog
  const currentStatusId = payload.statusDataId || null
  const prevStatusId = initialStatusDataId.value || null
  if (currentStatusId !== prevStatusId) {
    pendingPayload = payload
    transitionNotes.value = ''
    statusNotesDialogVisible.value = true
    return
  }

  await executeUpdate(payload, null)
}

const executeUpdate = async (payload, notes = null) => {
  if (notes) {
    payload.statusNotes = notes
  }

  isSubmitting.value = true
  try {
    const leadId = route.params.id
    await updateLead(leadId, payload)

    toast.add({ severity: 'success', summary: 'Updated', detail: 'Lead updated successfully', life: 3000 })
    router.push('/leads')
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: error.response?.data?.details || error.response?.data?.error || error.message, life: 5000 })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.lead-detail-view {
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
  text-align: center;
  padding: 4rem 2rem;
  color: var(--p-text-muted-color);
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
  margin-bottom: 1.25rem;
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
  margin-top: 1rem;
}

.modal-hint {
  font-size: 0.9rem;
  color: var(--p-text-muted-color);
  line-height: 1.4;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.modal-hint i {
  margin-top: 2px;
}
</style>

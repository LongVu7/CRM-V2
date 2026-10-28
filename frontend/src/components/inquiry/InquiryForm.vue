<template>
  <div class="inquiry-form-fields">
    <!-- Status Data Cascading Dropdowns -->
    <div class="form-grid three-col">
      <div class="form-field">
        <label>Status Interaction</label>
        <Select v-model="selectedInteraction" :options="interactions" optionLabel="label" optionValue="id"
          placeholder="Select interaction" :loading="loadingInteractions" fluid showClear />
      </div>
      <div class="form-field">
        <label>Status General</label>
        <Select v-model="selectedGeneral" :options="generals" optionLabel="label" optionValue="id"
          placeholder="Select general status" :loading="loadingGenerals" :disabled="!selectedInteraction" fluid showClear />
      </div>
      <div class="form-field">
        <label>Status Detail</label>
        <Select v-model="selectedDetail" :options="details" optionLabel="label" optionValue="id"
          placeholder="Select detail" :loading="loadingStatusDetails" :disabled="!selectedGeneral || details.length === 0" fluid showClear />
      </div>
    </div>

    <!-- Source Data Cascading Dropdowns -->
    <div class="form-grid three-col">
      <div class="form-field">
        <label>Source</label>
        <Select v-model="selectedSource" :options="sources" optionLabel="label" optionValue="id"
          placeholder="Select source" :loading="loadingSources" fluid showClear />
      </div>
      <div class="form-field">
        <label>Source Detail</label>
        <Select v-model="selectedSourceDetail" :options="sourceDetails" optionLabel="label" optionValue="id"
          placeholder="Select detail" :loading="loadingSourceDetails" :disabled="!selectedSource" fluid showClear />
      </div>
      <div class="form-field">
        <label>Approach Method</label>
        <Select v-model="selectedApproachMethod" :options="approachMethods" optionLabel="label" optionValue="id"
          placeholder="Select method" :loading="loadingMethods" :disabled="!selectedSourceDetail" fluid showClear />
      </div>
    </div>

    <div class="form-grid">
      <div class="form-field">
        <label>Data Received</label>
        <DatePicker :modelValue="modelValue.dataReceived" dateFormat="dd-mm-yy" placeholder="Select date"
          :showIcon="true" fluid @update:modelValue="emitField('dataReceived', $event)" />
      </div>
    </div>

    <div class="form-grid">
      <div class="form-field">
        <label>Description</label>
        <Textarea :modelValue="modelValue.description" rows="3" placeholder="Enter description" fluid
          @update:modelValue="emitField('description', $event)" />
      </div>
      <div class="form-field">
        <label>Priority</label>
        <Select :modelValue="modelValue.priority" :options="priorityOptions" optionLabel="label" optionValue="value" placeholder="Select priority" showClear fluid @update:modelValue="emitField('priority', $event)" />
      </div>
    </div>

    <div class="section-divider">Interaction Information</div>

    <div class="form-grid">
      <div class="form-field">
        <label>Create Date</label>
        <DatePicker :modelValue="modelValue.createDate ? new Date(modelValue.createDate) : null" dateFormat="dd-mm-yy" placeholder="Select date" :showIcon="true" fluid @update:modelValue="emitField('createDate', $event)" />
      </div>
      <div class="form-field">
        <label>Interaction Date</label>
        <DatePicker :modelValue="modelValue.interactionAt ? new Date(modelValue.interactionAt) : null" dateFormat="dd-mm-yy" placeholder="Select date" :showIcon="true" fluid @update:modelValue="emitField('interactionAt', $event)" />
      </div>
    </div>

    <div class="form-grid">
      <div class="form-field">
        <label>Call Count</label>
        <Select :modelValue="modelValue.callCount" :options="callCountOptions" optionLabel="label" optionValue="value" placeholder="Select count" showClear fluid @update:modelValue="emitField('callCount', $event)" />
      </div>
      <div class="form-field">
        <label>Compensation Status</label>
        <Select :modelValue="modelValue.compensationStatus" :options="compensationOptions" optionLabel="label" optionValue="value" placeholder="Select status" showClear fluid @update:modelValue="emitField('compensationStatus', $event)" />
      </div>
    </div>

    <div class="form-grid">
      <div class="form-field">
        <label>Record File</label>
        <InputText :modelValue="modelValue.recordFile" placeholder="Not available" disabled fluid />
      </div>
    </div>

    <div class="form-grid">
      <div class="form-field" style="grid-column: span 2;">
        <label>Event Names</label>
        <MultiSelect :modelValue="modelValue.eventNames" :options="eventOptions" optionLabel="label" optionValue="value" placeholder="Select events" filter display="chip" fluid @update:modelValue="emitField('eventNames', $event)" />
      </div>
    </div>

    <div class="form-grid">
      <div class="form-field" style="grid-column: span 2;">
        <label>Call Log</label>
        <Textarea :modelValue="modelValue.callLog" rows="3" placeholder="Enter call history" fluid @update:modelValue="emitField('callLog', $event)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, shallowRef, watch, onMounted, nextTick } from 'vue'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import MultiSelect from 'primevue/multiselect'
import { useSourceData } from '@/composables/useSourceData'
import { useStatusData } from '@/composables/useStatusData'

const callCountOptions = Array.from({ length: 10 }, (_, i) => ({
  label: `${i + 1} lần`,
  value: i + 1
}))

import { eventOptions, compensationOptions, priorityOptions } from '@/constants/inquiry'
const props = defineProps({
  modelValue: { type: Object, required: true },
  initialSourceDataId: { type: Number, default: null },
  initialStatusDataId: { type: Number, default: null }
})

const emit = defineEmits(['update:modelValue'])

// ─── Source Data composable
const {
  sources, sourceDetails, approachMethods,
  loadingSources, loadingSourceDetails, loadingMethods,
  fetchSources, fetchSourceDetails, fetchApproachMethods,
  findSourceNode
} = useSourceData()

// ─── Source Data local selections
const selectedSource = shallowRef(null)
const selectedSourceDetail = shallowRef(null)
const selectedApproachMethod = shallowRef(null)

// ─── Status Data composable
const {
  interactions, generals, details,
  loadingInteractions, loadingGenerals, loadingStatusDetails,
  fetchInteractions, fetchGenerals, fetchDetails,
  findStatusNode
} = useStatusData()

// ─── Status Data local selections
const selectedInteraction = shallowRef(null)
const selectedGeneral = shallowRef(null)
const selectedDetail = shallowRef(null)

let isRestoringSource = false
let isRestoringStatus = false

// ─── Emit helper: shallow-copy to avoid mutating prop
function emitField(field, value) {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

// ─── Status Data cascade via watchers
function updateStatusDataId() {
  const id = selectedDetail.value || selectedGeneral.value || selectedInteraction.value || null
  emitField('statusDataId', id)
}

watch(selectedInteraction, (newVal) => {
  if (isRestoringStatus) return
  selectedGeneral.value = null
  selectedDetail.value = null
  generals.value = []
  details.value = []
  updateStatusDataId()

  if (newVal) {
    fetchGenerals(newVal)
  }
})

watch(selectedGeneral, (newVal) => {
  if (isRestoringStatus) return
  selectedDetail.value = null
  details.value = []
  updateStatusDataId()

  if (newVal) {
    fetchDetails(newVal)
  }
})

watch(selectedDetail, () => {
  if (isRestoringStatus) return
  updateStatusDataId()
})

// ─── Source Data cascade via watchers 
function updateSourceDataId() {
  const id = selectedApproachMethod.value || selectedSourceDetail.value || selectedSource.value || null
  emitField('sourceDataId', id)
}

watch(selectedSource, (newVal) => {
  if (isRestoringSource) return
  selectedSourceDetail.value = null
  selectedApproachMethod.value = null
  sourceDetails.value = []
  approachMethods.value = []
  updateSourceDataId()

  if (newVal) {
    fetchSourceDetails(newVal)
  }
})

watch(selectedSourceDetail, (newVal) => {
  if (isRestoringSource) return
  selectedApproachMethod.value = null
  approachMethods.value = []
  updateSourceDataId()

  if (newVal) {
    fetchApproachMethods(newVal)
  }
})

watch(selectedApproachMethod, () => {
  if (isRestoringSource) return
  updateSourceDataId()
})

// ─── Restore status data selections when editing
async function restoreStatusSelections(statusDataId) {
  if (!statusDataId) return
  isRestoringStatus = true

  try {
    if (!interactions.value.length) {
      await fetchInteractions()
    }
    const info = findStatusNode(statusDataId)
    if (!info) return

    if (info.interactionId) {
      selectedInteraction.value = info.interactionId
      await fetchGenerals(selectedInteraction.value)
    }
    if (info.generalId) {
      selectedGeneral.value = info.generalId
      await fetchDetails(selectedGeneral.value)
    }
    if (info.detailId) {
      selectedDetail.value = info.detailId
    }
  } catch {
    // Silently fail — dropdown simply won't be pre-populated
  } finally {
    await nextTick()
    isRestoringStatus = false
  }
}

// ─── Restore source data selections when editing
async function restoreSourceSelections(sourceDataId) {
  if (!sourceDataId) return
  isRestoringSource = true

  try {
    if (!sources.value.length) {
      await fetchSources()
    }
    const info = findSourceNode(sourceDataId)
    if (!info) return

    if (info.sourceId) {
      selectedSource.value = info.sourceId
      await fetchSourceDetails(selectedSource.value)
    }
    if (info.detailId) {
      selectedSourceDetail.value = info.detailId
      await fetchApproachMethods(selectedSourceDetail.value)
    }
    if (info.methodId) {
      selectedApproachMethod.value = info.methodId
    }
  } catch {
    // Silently fail — dropdown simply won't be pre-populated
  } finally {
    await nextTick()
    isRestoringSource = false
  }
}

onMounted(async () => {
  await Promise.all([fetchSources(), fetchInteractions()])
  if (props.initialSourceDataId) {
    await restoreSourceSelections(props.initialSourceDataId)
  }
  if (props.initialStatusDataId) {
    await restoreStatusSelections(props.initialStatusDataId)
  }
})
</script>

<style scoped>
.inquiry-form-fields {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.section-divider {
  font-weight: 700;
  color: var(--p-primary-color, #4f46e5);
  margin-top: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--p-content-border-color, #e2e8f0);
}

.full-width {
  grid-column: 1 / -1;
}

.required-star {
  color: var(--p-red-500, #ef4444);
}

.field-hint {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  margin-top: 0.25rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.form-grid.three-col {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.form-field label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--p-text-color);
}

/* MultiSelect Chip Wrapping & Containment */
:deep(.p-multiselect) {
  max-width: 100%;
}

:deep(.p-multiselect-label-container) {
  min-width: 0;
  overflow: hidden;
}

:deep(.p-multiselect.p-multiselect-display-chip .p-multiselect-label) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  white-space: normal;
  padding: 0.375rem 0.5rem;
}

:deep(.p-multiselect-chip-item) {
  max-width: 100%;
  display: inline-flex;
}

:deep(.p-chip) {
  max-width: 100%;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-grid.three-col {
    grid-template-columns: 1fr;
  }
}
</style>

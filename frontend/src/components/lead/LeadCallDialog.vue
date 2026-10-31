<template>
  <Dialog
    :visible="visible"
    modal
    :closable="callState === 'idle' || callState === 'ended' || callState === 'busy' || callState === 'failed'"
    :style="{ width: '450px' }"
    :header="dialogTitle"
    @update:visible="handleClose"
  >
    <div class="call-dialog-container">
      <!-- Active Call Display -->
      <div v-if="callState !== 'ended' && callState !== 'busy' && callState !== 'failed'" class="active-call-content text-center py-4">
        <div class="student-avatar-wrapper mb-3">
          <div class="avatar-circle" :class="{ 'pulse-ring': callState === 'ringing' || callState === 'connected' }">
            <i class="pi pi-phone text-3xl"></i>
          </div>
        </div>

        <h3 class="student-name text-xl font-bold mb-1">{{ student?.fullName || 'Prospective Student' }}</h3>
        <p class="destination-phone text-sm text-500 mb-3 font-mono">{{ displayDestination }}</p>

        <!-- Live Status & Timer -->
        <div class="status-indicator-wrapper mb-4">
          <span v-if="callState === 'calling'" class="call-badge badge-calling">
            <i class="pi pi-spin pi-spinner mr-2"></i> Connecting...
          </span>
          <span v-else-if="callState === 'ringing'" class="call-badge badge-ringing">
            <i class="pi pi-bell mr-2 animate-bounce"></i> Ringing...
          </span>
          <span v-else-if="callState === 'connected'" class="call-badge badge-connected">
            <i class="pi pi-check-circle mr-2"></i> Connected • {{ formattedTimer }}
          </span>
        </div>

        <!-- In-Call Action Controls -->
        <div class="in-call-controls flex justify-content-center gap-3 mt-4">
          <Button
            :icon="isMuted ? 'pi pi-microphone-slash' : 'pi pi-microphone'"
            :label="isMuted ? 'Unmute' : 'Mute'"
            :severity="isMuted ? 'warn' : 'secondary'"
            outlined
            rounded
            :disabled="callState !== 'connected'"
            @click="toggleMute"
          />
          <Button
            icon="pi pi-phone"
            label="End Call"
            severity="danger"
            rounded
            @click="handleEndCall"
          />
        </div>
      </div>

      <!-- Post-Call Wrap-up & Disposition -->
      <div v-else class="post-call-summary py-2">
        <!-- Call Failure Alert -->
        <div v-if="callState === 'failed' || callError" class="p-3 mb-3 border-round surface-100 text-red-600 text-sm border-1 border-red-300 flex align-items-center gap-2">
          <i class="pi pi-exclamation-circle text-lg"></i>
          <div>
            <div class="font-bold">Call Could Not Connect</div>
            <div class="text-xs mt-1 text-700">{{ callError || 'Telephony service rejected the call session.' }}</div>
          </div>
        </div>

        <div class="summary-header mb-3 pb-2 border-bottom-1 surface-border flex justify-content-between align-items-center">
          <div>
            <div class="font-bold text-lg">{{ student?.fullName }}</div>
            <div class="text-sm text-500 font-mono">{{ displayDestination }}</div>
          </div>
          <div class="text-right">
            <span class="text-xs text-500 block uppercase">Talk Duration</span>
            <span class="font-bold font-mono text-primary text-base">{{ formattedTimer }}</span>
          </div>
        </div>

        <div class="form-field mb-3">
          <label class="block font-medium text-sm mb-1">Call Disposition</label>
          <Select
            v-model="selectedDisposition"
            :options="dispositionOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select call outcome..."
            class="w-full"
          />
        </div>

        <div class="form-field mb-3">
          <label class="block font-medium text-sm mb-1">Consultation Notes (Optional)</label>
          <Textarea
            v-model="callNotes"
            rows="3"
            placeholder="Enter consultation details, student questions, next appointment..."
            class="w-full"
            autoResize
            :maxlength="2000"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <div v-if="callState === 'ended' || callState === 'busy' || callState === 'failed'" class="flex justify-content-end gap-2">
        <Button label="Skip" severity="secondary" text @click="handleSkipAndClose" />
        <Button label="Save Call Log" icon="pi pi-check" :loading="isSaving" @click="handleSaveDisposition" />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';
import { useStringee } from '@/composables/useStringee';
import { updateCall } from '@/services/voipService';

const props = defineProps({
  visible: { type: Boolean, default: false },
  leadId: { type: [Number, String], required: true },
  student: { type: Object, default: () => ({}) },
  targetPhone: { type: String, default: '' }
});

const emit = defineEmits(['update:visible', 'call-completed']);
const toast = useToast();

const {
  callState,
  callError,
  isMuted,
  callDuration,
  currentCallRecord,
  hangupCall,
  toggleMute,
  resetCall
} = useStringee();

const selectedDisposition = ref('CONNECTED');
const callNotes = ref('');
const isSaving = ref(false);

const dispositionOptions = [
  { label: 'Connected / Answered', value: 'CONNECTED' },
  { label: 'Busy / Line Engaged', value: 'BUSY' },
  { label: 'No Answer / Ring Timeout', value: 'NO_ANSWER' },
  { label: 'Call Failed / Rejected', value: 'FAILED' },
  { label: 'Call Back Requested', value: 'CALL_BACK' },
  { label: 'Wrong Number / Invalid', value: 'WRONG_NUMBER' },
  { label: 'Consultation Completed', value: 'CONSULTATION_COMPLETED' }
];

const dialogTitle = computed(() => {
  if (callState.value === 'connected') 
    return 'Active Voice Call';
  if (callState.value === 'ringing' || callState.value === 'calling') 
    return 'Outgoing Consultation Call';
  if (callState.value === 'failed')
    return 'Call Failed';
  return 'Call Wrap-up & Notes';
});

const displayDestination = computed(() => {
  return props.targetPhone || props.student?.primaryPhone || props.student?.mobile || 'No Phone';
});

const formattedTimer = computed(() => {
  const total = callDuration.value || 0;
  const mins = Math.floor(total / 60).toString().padStart(2, '0');
  const secs = (total % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
});

watch(() => props.visible, (newVal) => {
  if (newVal) {
    selectedDisposition.value = 'CONNECTED';
    callNotes.value = '';
  }
});

watch(callState, (state) => {
  if (state === 'failed') {
    selectedDisposition.value = 'FAILED';
  } else if (state === 'busy') {
    selectedDisposition.value = 'BUSY';
  } else if (state === 'ended' && callDuration.value === 0) {
    selectedDisposition.value = 'NO_ANSWER';
  } else if (state === 'ended' && callDuration.value > 0) {
    selectedDisposition.value = 'CONNECTED';
  }
});

const handleEndCall = () => {
  hangupCall();
};

const handleClose = () => {
  if (callState.value === 'calling' || callState.value === 'ringing' || callState.value === 'connected') {
    return;
  }
  resetCall();
  emit('update:visible', false);
};

const handleSkipAndClose = () => {
  resetCall();
  emit('update:visible', false);
  emit('call-completed');
};

const handleSaveDisposition = async () => {
  if (!currentCallRecord.value?.id) {
    resetCall();
    emit('update:visible', false);
    emit('call-completed');
    return;
  }

  isSaving.value = true;
  try {
    await updateCall(currentCallRecord.value.id, {
      disposition: selectedDisposition.value,
      note: callNotes.value ? callNotes.value.trim() : null
    });

    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Call activity record saved',
      life: 3000
    });

    resetCall();
    emit('update:visible', false);
    emit('call-completed');
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message || 'Failed to save call details',
      life: 5000
    });
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.call-dialog-container {
  min-height: 200px;
}

.avatar-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--p-primary-50, #eff6ff);
  color: var(--p-primary-color, #2563eb);
  transition: all 0.3s ease;
}

.call-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
}

.badge-calling {
  background: #e0f2fe;
  color: #0369a1;
}

.badge-ringing {
  background: #fef3c7;
  color: #b45309;
}

.badge-connected {
  background: #dcfce7;
  color: #15803d;
}

.pulse-ring {
  box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4);
  animation: pulse 1.6s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.5);
  }
  70% {
    box-shadow: 0 0 0 16px rgba(37, 99, 235, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
  }
}
</style>

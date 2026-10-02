<template>
  <Button 
    @click="handleCall" 
    :disabled="isCallActive"
    :icon="isCallActive ? 'pi pi-spin pi-spinner' : 'pi pi-phone'"
    :label="isCallActive ? 'Call in progress' : 'Call'"
    severity="info"
    :loading="loading"
  />
</template>

<script setup>
import { computed } from 'vue';
import Button from 'primevue/button';
import { useCall } from '@/composables/useCall';
import { useCallSessionStore } from '@/stores/callSessionStore';

const props = defineProps({
  phoneNumber: {
    type: String,
    required: true
  },
  studentId: {
    type: Number,
    default: null
  },
  inquiryId: {
    type: Number,
    default: null
  }
});

const store = useCallSessionStore();
const isRegistered = computed(() => store.isRegistered);
const { makeOutboundCall, loading } = useCall();

const isCallActive = computed(() => !!store.activeCallId);

const handleCall = async () => {
  if (!isRegistered.value) {
    alert("VoIP is not connected. Please connect first.");
    return;
  }
  
  await makeOutboundCall(props.phoneNumber, {
    studentId: props.studentId,
    inquiryId: props.inquiryId
  });
};
</script>

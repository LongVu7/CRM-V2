<template>
  <Dialog 
    v-model:visible="isVisible" 
    modal 
    :closable="false"
    header="Incoming Call" 
    :style="{ width: '30rem' }"
  >
    <div class="flex flex-column align-items-center gap-3">
      <i class="pi pi-phone text-blue-500 text-6xl animation-shake"></i>
      
      <div class="text-center">
        <div class="text-2xl font-bold mb-1">{{ callerIdentifier }}</div>
        <div class="text-500" v-if="hasMultipleMatches">Multiple matches found</div>
      </div>

      <div v-if="hasMultipleMatches" class="w-full">
        <p class="text-sm text-500 mb-2">Please select the student you are talking to:</p>
        <Listbox 
          v-model="selectedMatch" 
          :options="incomingCall.matches" 
          optionLabel="fullName" 
          class="w-full"
        />
      </div>

      <div class="flex w-full gap-3 mt-4">
        <Button 
          label="Decline" 
          icon="pi pi-times" 
          severity="danger" 
          class="flex-1" 
          @click="declineCall" 
        />
        <Button 
          label="Answer" 
          icon="pi pi-check" 
          severity="success" 
          class="flex-1" 
          @click="answerCall" 
        />
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useCallSessionStore } from '@/stores/callSessionStore';
import { sipClient } from '@/utils/sipClient';

const store = useCallSessionStore();
const incomingCall = computed(() => store.incomingCall);
const isVisible = computed(() => !!incomingCall.value);

const selectedMatch = ref(null);

const hasMultipleMatches = computed(() => incomingCall.value?.matches?.length > 1);
const callerIdentifier = computed(() => {
  if (!incomingCall.value) return '';
  const matches = incomingCall.value.matches;
  if (matches.length === 1) return matches[0].fullName;
  if (matches.length > 1) return incomingCall.value.callerNumber;
  return `Unknown (${incomingCall.value.callerNumber})`;
});

watch(incomingCall, (newVal) => {
  if (newVal && newVal.matches.length === 1) {
    selectedMatch.value = newVal.matches[0];
  } else {
    selectedMatch.value = null;
  }
});

const answerCall = async () => {
  // Logic to answer via SIP.js
  if (store.incomingCall?.sessionId) {
    await sipClient.answer(store.incomingCall.sessionId);
  }
  
  store.setActiveCall({
    id: store.incomingCall.correlationId,
    status: 'CONNECTED',
    remoteNumber: store.incomingCall.callerNumber,
    direction: 'INBOUND'
  });
  store.clearIncomingCall();
};

const declineCall = async () => {
  if (store.incomingCall?.sessionId) {
    await sipClient.decline(store.incomingCall.sessionId);
  }
  store.clearIncomingCall();
};
</script>

<style scoped>
@keyframes shake {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(-15deg); }
  50% { transform: rotate(0deg); }
  75% { transform: rotate(15deg); }
  100% { transform: rotate(0deg); }
}
.animation-shake {
  animation: shake 0.5s infinite;
}
</style>

<template>
  <div v-if="activeCallId" class="fixed bottom-0 right-0 m-4 z-5 min-w-20rem">
    <Card>
      <template #title>
        <div class="flex justify-content-between align-items-center">
          <span class="text-lg font-bold text-primary uppercase text-sm">
            {{ direction }} Call
          </span>
          <Tag :value="callStatus" severity="info" rounded></Tag>
        </div>
      </template>
      <template #content>
        <div class="flex flex-column gap-2 mb-3">
          <div class="text-xl font-bold">{{ remoteNumber }}</div>
          <div class="text-sm font-mono text-500">{{ formatDuration(duration) }}</div>
        </div>
        <div class="flex gap-2 w-full">
          <Button 
            @click="endCall" 
            label="End Call" 
            icon="pi pi-phone" 
            severity="danger" 
            class="w-full"
          />
        </div>
      </template>
    </Card>

    <DispositionModal 
      v-model:visible="showDispositionModal" 
      @saved="onDispositionSaved"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useCallSessionStore } from '@/stores/callSessionStore';
import { useCall } from '@/composables/useCall';
import DispositionModal from './DispositionModal.vue';

const store = useCallSessionStore();
const { endCall: endCallAction } = useCall();

const activeCallId = computed(() => store.activeCallId);
const direction = computed(() => store.direction);
const remoteNumber = computed(() => store.remoteNumber);
const callStatus = computed(() => store.callStatus);
const duration = computed(() => store.duration);
const showDispositionModal = ref(false);

watch(callStatus, (newStatus) => {
  if (['COMPLETED', 'MISSED', 'DECLINED', 'FAILED', 'DROPPED', 'NO_ANSWER', 'BUSY'].includes(newStatus)) {
    showDispositionModal.value = true;
  }
});

const endCall = () => {
  endCallAction(); // from useCall
  // The ARI event or SIP event will eventually update state to a terminal state
  // which will trigger the watch above. For MVP, we can simulate it:
  store.updateCallStatus('COMPLETED');
};

const onDispositionSaved = () => {
  showDispositionModal.value = false;
};

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};
</script>

<template>
  <Dialog 
    v-model:visible="isVisible" 
    modal 
    header="Call Disposition" 
    :style="{ width: '35rem' }"
    :closable="false"
  >
    <div class="flex flex-column gap-3 py-3">
      <div class="field">
        <label for="disposition" class="font-bold block mb-2">Outcome</label>
        <Select 
          id="disposition"
          v-model="selectedDisposition" 
          :options="dispositions" 
          optionLabel="name" 
          placeholder="Select an outcome" 
          class="w-full"
        />
      </div>

      <div class="field" v-if="selectedDisposition?.requireNotes">
        <label for="notes" class="font-bold block mb-2">Notes <span class="text-red-500">*</span></label>
        <Textarea 
          id="notes" 
          v-model="notes" 
          rows="4" 
          class="w-full"
          placeholder="Enter call notes..."
        />
      </div>
      <div class="field" v-else>
        <label for="notes" class="font-bold block mb-2">Notes (Optional)</label>
        <Textarea 
          id="notes" 
          v-model="notes" 
          rows="4" 
          class="w-full"
          placeholder="Enter call notes..."
        />
      </div>
    </div>
    <template #footer>
      <Button 
        label="Save Disposition" 
        icon="pi pi-check" 
        @click="saveDisposition" 
        :disabled="!isValid" 
        :loading="saving"
      />
    </template>
  </Dialog>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useCallDispositionStore } from '@/stores/callDispositionStore';
import { useCallSessionStore } from '@/stores/callSessionStore';

const props = defineProps({
  visible: Boolean
});

const emit = defineEmits(['update:visible', 'saved']);

const dispositionStore = useCallDispositionStore();
const sessionStore = useCallSessionStore();

const isVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
});

const dispositions = computed(() => dispositionStore.dispositions);
const selectedDisposition = ref(null);
const notes = ref('');
const saving = ref(false);

const isValid = computed(() => {
  if (!selectedDisposition.value) return false;
  if (selectedDisposition.value.requireNotes && !notes.value.trim()) return false;
  return true;
});

onMounted(() => {
  dispositionStore.fetchDispositions();
});

const saveDisposition = async () => {
  if (!isValid.value) return;
  saving.value = true;
  try {
    // In a real implementation, you'd call an API to save this to the DB
    // e.g. PUT /api/calls/:correlationId with status=COMPLETED and dispositionId
    
    // Clear session state
    sessionStore.clearActiveCall();
    emit('saved');
    isVisible.value = false;
  } catch (error) {
    console.error('Failed to save disposition', error);
  } finally {
    saving.value = false;
  }
};
</script>

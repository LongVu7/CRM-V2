<template>
  <Dialog
    :visible="visible"
    :header="`Lead #${leadId} Status Transition History`"
    modal
    :style="{ width: '600px', maxWidth: '92vw' }"
    :closable="true"
    dismissableMask
    @update:visible="onVisibleChange"
  >
    <div class="status-history-dialog-content">
      <LeadStatusTimeline v-if="visible && leadId" :leadId="leadId" />
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button label="Close" severity="secondary" text @click="closeDialog" />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import LeadStatusTimeline from '@/components/lead/LeadStatusTimeline.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  leadId: {
    type: [Number, String],
    default: null
  }
})

const emit = defineEmits(['update:visible'])

function onVisibleChange(val) {
  emit('update:visible', val)
}

function closeDialog() {
  emit('update:visible', false)
}
</script>

<style scoped>
.status-history-dialog-content {
  padding: 0.5rem 0 1rem;
  max-height: 65vh;
  overflow-y: auto;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>

<template>
  <div class="result-container">
    <i class="pi pi-check-circle result-icon"></i>
    <h3>Import Completed</h3>
    
    <div class="result-stats">
      <div class="stat-row">
        <span>New Students & Inquiries Created:</span>
        <strong>{{ resultStats.newStudentsCreated }}</strong>
      </div>
      <div class="stat-row">
        <span>Inquiries Created for Existing Students:</span>
        <strong>{{ resultStats.newInquiriesForExisting }}</strong>
      </div>
      <div class="stat-row">
        <span>Rows Skipped:</span>
        <strong>{{ resultStats.skipped }}</strong>
      </div>
    </div>
    
    <Button label="Import Another File" icon="pi pi-refresh" class="mt-4" @click="emit('reset')" />
  </div>
</template>

<script setup>
import Button from 'primevue/button'

const props = defineProps({
  resultStats: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['reset'])
</script>
<style scoped>
.result-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  text-align: center;
}
.result-icon {
  font-size: 4rem;
  color: var(--p-green-500);
  margin-bottom: 1rem;
}
.result-stats {
  width: 100%;
  max-width: 400px;
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 1rem;
}
.stat-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  font-size: 1rem;
}
.stat-row:last-child {
  margin-bottom: 0;
}
.mt-4 { margin-top: 1.5rem; }
</style>

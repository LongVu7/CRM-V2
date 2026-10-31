<template>
  <div class="result-container">
    <i class="pi pi-check-circle result-icon"></i>
    <h3>Import Completed</h3>
    
    <div class="result-stats">
      <div class="stat-row">
        <span>New Students & Leads Created:</span>
        <strong>{{ resultStats.newStudentsCreated }}</strong>
      </div>
      <div class="stat-row">
        <span>Leads Created for Existing Students:</span>
        <strong>{{ resultStats.newLeadsForExisting }}</strong>
      </div>
      <div class="stat-row">
        <span>Rows Skipped:</span>
        <strong>{{ resultStats.skipped }}</strong>
      </div>
    </div>
    
    <div class="result-actions">
      <Button label="Import Another File" icon="pi pi-refresh" severity="secondary" outlined @click="emit('reset')" />
      <Button label="Go to Leads" icon="pi pi-arrow-right" iconPos="right" @click="router.push('/leads')" />
    </div>
  </div>
</template>

<script setup>
import Button from 'primevue/button'
import { useRouter } from 'vue-router'

const props = defineProps({
  resultStats: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['reset'])
const router = useRouter()
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
.result-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  justify-content: center;
}
</style>

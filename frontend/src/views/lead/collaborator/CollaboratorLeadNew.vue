<template>
  <div class="lead-new-view">
    <div class="page-header">
      <h1>Create New Lead</h1>
      <Button 
        label="Back to List" 
        severity="secondary" 
        icon="pi pi-arrow-left" 
        @click="$router.push('/collaborator/leads')" 
      />
    </div>

    <div class="cards-container">
      <div class="section-card">
        <LeadForm ref="leadFormRef" :hideStatusAndInteraction="true" />
      </div>
    </div>

    <div class="global-actions">
      <Button 
        label="Create Lead" 
        icon="pi pi-check" 
        size="large" 
        @click="submitGlobal" 
        :loading="isSubmitting" 
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useLead } from '@/composables/useLead'
import LeadForm from '@/components/lead/LeadForm.vue'

const router = useRouter()
const toast = useToast()
const { createLead } = useLead()

const leadFormRef = ref(null)
const isSubmitting = ref(false)

const submitGlobal = async () => {
  if (!leadFormRef.value?.validate()) {
    const errorMsg = leadFormRef.value?.getFirstError?.() || 'Please check all required fields and formats'
    toast.add({ severity: 'error', summary: 'Validation Error', detail: errorMsg, life: 4000 })
    return
  }

  const payload = leadFormRef.value.getPayload()

  isSubmitting.value = true
  try {
    await createLead(payload)
    toast.add({ severity: 'success', summary: 'Created', detail: 'Lead created successfully', life: 3000 })
    router.push('/collaborator/leads')
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: error.response?.data?.details || error.response?.data?.error || error.message, life: 5000 })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.lead-new-view { padding: 1.5rem 2rem; max-width: 1000px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--p-text-color); }
.cards-container { display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2rem; }
.section-card { 
  background: var(--p-content-background); 
  border: 1px solid var(--p-surface-200); 
  border-radius: 12px; 
  padding: 1.5rem; 
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); 
}
.global-actions { display: flex; justify-content: flex-end; }
</style>


<template>
  <div class="campaign-new-view">
    <div class="page-header">
      <h1>Create New Campaign</h1>
      <Button label="Back to List" severity="secondary" icon="pi pi-arrow-left" @click="$router.push('/campaigns')" />
    </div>

    <div class="section-card">
      <div class="card-header">
        <h2><i class="pi pi-plus-circle"></i> Campaign Details</h2>
      </div>
      <CampaignForm 
          v-model="campaignData" 
          :isEditMode="false" 
          :loading="loading" 
          @save="handleSave" 
          @cancel="handleCancel" 
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useCampaigns } from '@/composables/useCampaigns'
import CampaignForm from '@/components/campaign/CampaignForm.vue'
import Button from 'primevue/button'

const router = useRouter()
const toast = useToast()
const { createCampaign, loading, error } = useCampaigns()

const campaignData = ref({
    name: '',
    description: '',
    ownerId: null,
    status: 'in_progress',
    startDate: null,
    endDate: null,
    notes: ''
})

const handleSave = async () => {
    try {
        await createCampaign(campaignData.value)
        toast.add({ severity: 'success', summary: 'Success', detail: 'Campaign created successfully', life: 3000 })
        router.push('/campaigns')
    } catch (err) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.value || 'Failed to create campaign', life: 3000 })
    }
}

const handleCancel = () => {
    router.push('/campaigns')
}
</script>

<style scoped>
.campaign-new-view { padding: 1.5rem 2rem; max-width: 900px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--p-text-color); }
.section-card { 
  background: var(--p-content-background); 
  border: 1px solid var(--p-surface-200); 
  border-radius: 12px; 
  padding: 1.5rem; 
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); 
}
.card-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 1.5rem; border-bottom: 1px solid var(--p-surface-100); padding-bottom: 0.75rem;
}
.card-header h2 {
  font-size: 1.15rem; margin: 0; display: flex; align-items: center; gap: 0.5rem; color: var(--p-text-color);
}
.card-header h2 i { color: var(--p-primary-color); }
</style>

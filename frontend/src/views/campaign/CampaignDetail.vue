<template>
  <div class="campaign-detail">
    <div class="page-header">
      <h1>Campaign Detail</h1>
      <Button label="Back to List" severity="secondary" icon="pi pi-arrow-left" @click="$router.push('/campaigns')" />
    </div>

    <div v-if="loading && !campaignData.id" class="loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <p>Loading campaign data...</p>
    </div>

    <div v-else-if="notFound" class="empty-state">
      <i class="pi pi-exclamation-triangle"></i>
      <h3>Campaign Not Found</h3>
      <p>The campaign you are looking for does not exist.</p>
      <Button label="Back to List" icon="pi pi-arrow-left" @click="$router.push('/campaigns')" />
    </div>

    <div v-else class="cards-container">
      <!-- Campaign Details -->
      <div class="section-card">
        <div class="card-header">
          <h2><i class="pi pi-info-circle"></i> Campaign Details</h2>
        </div>
        <CampaignForm 
            v-model="campaignData" 
            :isEditMode="true" 
            :loading="loading" 
            @save="handleSaveCampaign" 
            @cancel="$router.push('/campaigns')" 
        />
      </div>

      <!-- Activities -->
      <div class="section-card">
        <div class="card-header">
          <h2><i class="pi pi-bolt"></i> Campaign Activities</h2>
          <Button label="Add Activity" icon="pi pi-plus" @click="openActivityDialog()" size="small" />
        </div>
        <ActivityList 
            :activities="activities" 
            :loading="loading"
            @edit="openActivityDialog"
            @delete="handleDeleteActivity"
            @send="handleSendActivity"
            @recipients="openRecipientsForActivity"
        />
      </div>
    </div>

    <!-- Activity Dialog -->
    <Dialog v-model:visible="showActivityDialog" :header="editingActivity ? 'Edit Activity' : 'Create Activity'" modal :style="{ width: '50vw' }">
      <ActivityForm 
          v-model="activityFormData" 
          :isEditMode="!!editingActivity"
          :loading="activityLoading"
          @save="handleSaveActivity"
          @cancel="showActivityDialog = false"
      />
    </Dialog>

    <!-- Recipient Selector Dialog -->
    <RecipientSelector 
        v-if="showRecipientDialog"
        v-model:visible="showRecipientDialog" 
        :loading="recipientLoading"
        :initialRecipients="selectedActivityForRecipients?.recipients || []"
        @add="handleRecipientsAdded" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useCampaigns } from '@/composables/useCampaigns'
import CampaignForm from '@/components/campaign/CampaignForm.vue'
import ActivityForm from '@/components/campaign/ActivityForm.vue'
import ActivityList from '@/components/campaign/ActivityList.vue'
import RecipientSelector from '@/components/campaign/RecipientSelector.vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const campaignId = route.params.id

const { 
  loading, error, 
  fetchCampaignById, updateCampaign, 
  createActivity, updateActivity, deleteActivity, 
  addActivityRecipients, sendActivity 
} = useCampaigns()

const campaignData = ref({
    id: null, name: '', description: '', ownerId: null,
    status: 'in_progress', startDate: null, endDate: null, notes: ''
})
const activities = ref([])
const notFound = ref(false)

// Activity dialog state
const showActivityDialog = ref(false)
const editingActivity = ref(null)
const activityLoading = ref(false)
const activityFormData = ref({
    type: 'EMAIL', name: '', subject: '', content: '', scheduledAt: null
})

// Recipient dialog state
const showRecipientDialog = ref(false)
const recipientLoading = ref(false)
const selectedActivityForRecipients = ref(null)

const loadData = async () => {
    try {
        const data = await fetchCampaignById(campaignId)
        campaignData.value = {
            id: data.id,
            name: data.name,
            description: data.description,
            ownerId: data.ownerId,
            status: data.status,
            startDate: data.startDate ? new Date(data.startDate) : null,
            endDate: data.endDate ? new Date(data.endDate) : null,
            notes: data.notes
        }
        activities.value = data.activities || []
    } catch (err) {
        notFound.value = true
    }
}

onMounted(() => loadData())

const handleSaveCampaign = async () => {
    try {
        await updateCampaign(campaignId, campaignData.value)
        toast.add({ severity: 'success', summary: 'Success', detail: 'Campaign updated', life: 3000 })
    } catch (err) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.value, life: 3000 })
    }
}

// ─── Activity handlers ───

const openActivityDialog = (activity = null) => {
    if (activity) {
        editingActivity.value = activity
        activityFormData.value = { ...activity }
    } else {
        editingActivity.value = null
        activityFormData.value = { type: 'EMAIL', name: '', subject: '', content: '', scheduledAt: null }
    }
    showActivityDialog.value = true
}

const handleSaveActivity = async () => {
    activityLoading.value = true
    try {
        if (editingActivity.value) {
            await updateActivity(campaignId, editingActivity.value.id, activityFormData.value)
            toast.add({ severity: 'success', summary: 'Success', detail: 'Activity updated', life: 3000 })
        } else {
            await createActivity(campaignId, activityFormData.value)
            toast.add({ severity: 'success', summary: 'Success', detail: 'Activity created', life: 3000 })
        }
        showActivityDialog.value = false
        await loadData()
    } catch (err) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.value, life: 3000 })
    } finally {
        activityLoading.value = false
    }
}

const handleDeleteActivity = async (activity) => {
    if (!confirm(`Delete activity "${activity.name}"?`)) return
    try {
        await deleteActivity(campaignId, activity.id)
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'Activity deleted', life: 3000 })
        await loadData()
    } catch (err) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.value, life: 3000 })
    }
}

const handleSendActivity = async (activity) => {
    if (!confirm(`Send emails to all recipients of "${activity.name}"?`)) return
    activityLoading.value = true
    try {
        const result = await sendActivity(campaignId, activity.id)
        toast.add({ severity: 'success', summary: 'Sent', detail: `Sent: ${result.sentCount}, Failed: ${result.failedCount}`, life: 5000 })
        await loadData()
    } catch (err) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.value, life: 5000 })
    } finally {
        activityLoading.value = false
    }
}

// ─── Recipient handlers ───

const openRecipientsForActivity = (activity) => {
    selectedActivityForRecipients.value = activity
    showRecipientDialog.value = true
}

const handleRecipientsAdded = async (inquiryIds) => {
    if (!selectedActivityForRecipients.value) return
    recipientLoading.value = true
    try {
        await addActivityRecipients(campaignId, selectedActivityForRecipients.value.id, inquiryIds)
        toast.add({ severity: 'success', summary: 'Success', detail: 'Recipients added', life: 3000 })
        showRecipientDialog.value = false
        await loadData()
    } catch (err) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.value, life: 3000 })
    } finally {
        recipientLoading.value = false
    }
}
</script>

<style scoped>
.campaign-detail { padding: 1.5rem 2rem; max-width: 1000px; margin: 0 auto; }
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
.card-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 1.5rem; border-bottom: 1px solid var(--p-surface-100); padding-bottom: 0.75rem;
}
.card-header h2 {
  font-size: 1.15rem; margin: 0; display: flex; align-items: center; gap: 0.5rem; color: var(--p-text-color);
}
.card-header h2 i { color: var(--p-primary-color); }
.loading-state {
  display: flex; flex-direction: column; align-items: center;
  padding: 4rem 1rem; gap: 0.75rem; color: var(--p-text-muted-color);
}
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  padding: 4rem 1rem; gap: 0.5rem; color: var(--p-text-muted-color);
}
.empty-state i { font-size: 3rem; margin-bottom: 0.5rem; color: var(--p-orange-400); }
.empty-state h3 { margin: 0; font-size: 1.15rem; font-weight: 600; color: var(--p-text-color); }
.empty-state p { margin: 0 0 1rem 0; font-size: 0.9rem; }
</style>

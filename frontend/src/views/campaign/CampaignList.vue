<template>
  <div class="campaign-list-view">
    <div class="page-header">
      <div class="header-left">
        <h1><i class="pi pi-bullhorn"></i> Campaign Management</h1>
        <Tag :value="`${campaigns?.length || 0} campaigns`" severity="info" rounded />
      </div>
      <div class="header-actions">
        <Button label="New Campaign" icon="pi pi-plus" @click="navigateToCreate" />
      </div>
    </div>

    <CampaignTable 
      :campaigns="campaigns" 
      :loading="loading" 
      @edit="handleEdit" 
      @delete="handleDelete" 
    />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useCampaigns } from '@/composables/useCampaigns';
import CampaignTable from '@/components/campaign/CampaignTable.vue';
import Button from 'primevue/button';
import Tag from 'primevue/tag';

const router = useRouter();
const toast = useToast();
const { campaigns, loading, error, fetchCampaigns, deleteCampaign } = useCampaigns();

onMounted(async () => {
    try {
        await fetchCampaigns();
    } catch (err) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.value, life: 3000 });
    }
});

const handleEdit = (id) => {
    router.push(`/campaigns/${id}`);
};

const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
        try {
            await deleteCampaign(id);
            toast.add({ severity: 'success', summary: 'Successful', detail: 'Campaign Deleted', life: 3000 });
        } catch (err) {
            toast.add({ severity: 'error', summary: 'Error', detail: error.value, life: 3000 });
        }
    }
};

const navigateToCreate = () => {
    router.push('/campaigns/new');
};
</script>

<style scoped>
.campaign-list-view { padding: 1.5rem 2rem; max-width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
.header-left { display: flex; align-items: center; gap: 0.75rem; }
.header-left h1 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--p-text-color); }
.header-left h1 i { color: var(--p-primary-color); }
.header-actions { display: flex; gap: 0.5rem; }

@media (max-width: 768px) {
  .campaign-list-view { padding: 1rem; }
  .page-header { flex-direction: column; align-items: flex-start; }
}
</style>

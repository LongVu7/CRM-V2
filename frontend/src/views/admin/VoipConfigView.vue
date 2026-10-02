<template>
  <div class="voip-config-view p-4">
    <div class="flex justify-content-between align-items-center mb-4">
      <h2 class="m-0">VoIP Extension Configuration</h2>
      <Button label="New Extension" icon="pi pi-plus" @click="showAddDialog = true" />
    </div>

    <DataTable :value="extensions" :loading="loading" :paginator="true" :rows="10">
      <Column field="extensionNumber" header="Extension Number"></Column>
      <Column field="account.fullName" header="Assigned To"></Column>
      <Column field="isActive" header="Status">
        <template #body="slotProps">
          <Tag :severity="slotProps.data.isActive ? 'success' : 'danger'" :value="slotProps.data.isActive ? 'Active' : 'Inactive'" />
        </template>
      </Column>
    </DataTable>

    <!-- Dialog to Add Extension omitted for brevity in MVP -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '@/services/apiClient';

const extensions = ref([]);
const loading = ref(false);
const showAddDialog = ref(false);

const fetchExtensions = async () => {
  loading.value = true;
  try {
    const { data } = await apiClient.get('/voip-extensions');
    extensions.value = data.data;
  } catch (error) {
    console.error('Failed to load extensions', error);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchExtensions);
</script>

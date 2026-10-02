<template>
  <div class="audit-log-view p-4">
    <div class="flex justify-content-between align-items-center mb-4">
      <h2 class="m-0">Audit Logs</h2>
    </div>
    
    <DataTable :value="logs" :loading="loading" :paginator="true" :rows="20">
      <Column field="createdAt" header="Timestamp">
        <template #body="slotProps">
          {{ new Date(slotProps.data.createdAt).toLocaleString() }}
        </template>
      </Column>
      <Column field="actionType" header="Action"></Column>
      <Column field="actorId" header="Actor ID"></Column>
      <Column field="entityType" header="Entity"></Column>
      <Column field="entityId" header="Entity ID"></Column>
      <Column field="ipAddress" header="IP Address"></Column>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '@/services/apiClient';

const logs = ref([]);
const loading = ref(false);

const fetchLogs = async () => {
  loading.value = true;
  try {
    const { data } = await apiClient.get('/audit-logs');
    logs.value = data.data;
  } catch (error) {
    console.error('Failed to load audit logs', error);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchLogs);
</script>

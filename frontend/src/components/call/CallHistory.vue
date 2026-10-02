<template>
  <div class="call-history">
    <DataTable :value="calls" :loading="loading" :paginator="true" :rows="10">
      <Column field="startedAt" header="Date" :sortable="true">
        <template #body="slotProps">
          {{ new Date(slotProps.data.startedAt).toLocaleString() }}
        </template>
      </Column>
      <Column field="direction" header="Direction">
        <template #body="slotProps">
          <Tag :severity="slotProps.data.direction === 'INBOUND' ? 'success' : 'info'" :value="slotProps.data.direction" />
        </template>
      </Column>
      <Column field="status" header="Status">
        <template #body="slotProps">
          <Tag :value="slotProps.data.status" />
        </template>
      </Column>
      <Column header="Duration">
        <template #body="slotProps">
          {{ formatDuration(slotProps.data.durationSeconds || 0) }}
        </template>
      </Column>
      <Column field="handledBy.fullName" header="Agent"></Column>
      <Column field="disposition.name" header="Outcome"></Column>
      <Column field="notes" header="Notes"></Column>
    </DataTable>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useCallHistory } from '@/composables/useCallHistory';

const props = defineProps({
  studentId: { type: Number, default: null },
  inquiryId: { type: Number, default: null },
});

const { calls, loading, fetchCalls } = useCallHistory();

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

onMounted(() => {
  fetchCalls({
    studentId: props.studentId,
    inquiryId: props.inquiryId
  });
});
</script>

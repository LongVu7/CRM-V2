<template>
  <div class="chart-container bg-white dark:bg-gray-800 border rounded shadow-sm p-4 col-span-1 md:col-span-2">
    <h3 class="text-lg font-semibold mb-4">Thống kê tỷ lệ xử lý data</h3>
    <DataTable :value="ratesByAdvisor" dataKey="advisorId" responsiveLayout="scroll" :paginator="true" :rows="10">
      <Column v-for="col in ADVISOR_RATE_COLUMNS" :key="col.field" :field="col.field" :header="col.header" :class="col.class">
        <template #body="{ data }" v-if="col.isRate">
          {{ data[col.field] }}%
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup>
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { ADVISOR_RATE_COLUMNS } from '@/constants/report'

defineProps({
  ratesByAdvisor: {
    type: Array,
    default: () => []
  }
})
</script>

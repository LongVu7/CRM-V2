<template>
  <div class="chart-container bg-white dark:bg-gray-800 border rounded shadow-sm p-4 col-span-1 md:col-span-2">
    <h3 class="text-lg font-semibold mb-4">2. Bảng tình trạng xử lý data</h3>
    <DataTable :value="statusByAdvisor" dataKey="advisorId" responsiveLayout="scroll" :paginator="true" :rows="10" scrollable scrollHeight="400px">
      <Column field="advisorName" header="Tư vấn" frozen class="font-semibold"></Column>
      <Column v-for="status in ADVISOR_STATUS_CONFIG" :key="status.key" :field="status.key" :header="status.label"></Column>
      <Column field="processed" header="Tổng data xử lý" class="font-semibold">
        <template #body="{ data }">
          <span class="font-bold">{{ data.processed ?? 0 }}</span>
        </template>
      </Column>

      <!-- Footer total row -->
      <ColumnGroup type="footer">
        <Row>
          <Column footer="Tổng" frozen :colspan="1" class="font-bold" footerStyle="font-weight: bold" />
          <Column v-for="status in ADVISOR_STATUS_CONFIG" :key="'footer-' + status.key" :footer="totals[status.key]" />
          <Column :footer="totals.processed" footerStyle="font-weight: bold" />
        </Row>
      </ColumnGroup>
    </DataTable>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ColumnGroup from 'primevue/columngroup'
import Row from 'primevue/row'
import { ADVISOR_STATUS_CONFIG } from '@/constants/report'

const props = defineProps({
  statusByAdvisor: {
    type: Array,
    default: () => []
  }
})

const STATUS_FIELDS = ['processed', ...ADVISOR_STATUS_CONFIG.map(s => s.key)]

const totals = computed(() => {
  const seed = Object.fromEntries(STATUS_FIELDS.map(f => [f, 0]))
  return props.statusByAdvisor.reduce((acc, row) => {
    for (const f of STATUS_FIELDS) {
      acc[f] += row[f] ?? 0
    }
    return acc
  }, seed)
})
</script>

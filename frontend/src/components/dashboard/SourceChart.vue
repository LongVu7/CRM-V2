<template>
  <div class="chart-container bg-white dark:bg-gray-800 border rounded shadow-sm p-4 col-span-1 md:col-span-2">
    <h3 class="text-lg font-semibold mb-4">Thống kê tình trạng theo nguồn</h3>
    <DataTable :value="bySource" v-model:expandedRows="expandedRows" dataKey="sourceKey" responsiveLayout="scroll">
      <Column expander style="width: 3rem" />
      <Column field="sourceLabel" header="Nguồn" class="font-semibold"></Column>
      <Column v-for="status in ADVISOR_STATUS_CONFIG" :key="status.key" :field="status.key" :header="status.label"></Column>
      <Column field="totalProcessed" header="Tổng data xử lý" class="font-bold"></Column>

      <!-- Expandable Source Details -->
      <template #expansion="slotProps">
        <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded my-2 ml-10 border border-gray-100 dark:border-gray-700">
          <DataTable :value="slotProps.data.details" dataKey="sourceDetailKey">
            <Column field="sourceDetailLabel" header="Chi tiết Nguồn" class="font-semibold text-gray-600"></Column>
            <Column v-for="status in ADVISOR_STATUS_CONFIG" :key="status.key" :field="status.key" :header="status.label"></Column>
            <Column field="totalProcessed" header="Tổng data xử lý" class="font-bold text-gray-700"></Column>
          </DataTable>
        </div>
      </template>

      <!-- Footer Tổng row -->
      <ColumnGroup type="footer">
        <Row>
          <Column footer="Tổng" frozen :colspan="2" class="font-bold" footerStyle="font-weight: bold" />
          <Column v-for="status in ADVISOR_STATUS_CONFIG" :key="'footer-' + status.key" :footer="totals[status.key]" />
          <Column :footer="totals.totalProcessed" footerStyle="font-weight: bold" />
        </Row>
      </ColumnGroup>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ColumnGroup from 'primevue/columngroup'
import Row from 'primevue/row'
import { ADVISOR_STATUS_CONFIG } from '@/constants/report'

const props = defineProps({
  bySource: {
    type: Array,
    default: () => []
  }
})

const expandedRows = ref([])

const STATUS_FIELDS = ['totalProcessed', ...ADVISOR_STATUS_CONFIG.map(s => s.key)]

const totals = computed(() => {
  const seed = Object.fromEntries(STATUS_FIELDS.map(f => [f, 0]))
  return props.bySource.reduce((acc, sourceGroup) => {
    for (const f of STATUS_FIELDS) {
      acc[f] += sourceGroup[f] ?? 0
    }
    return acc
  }, seed)
})
</script>

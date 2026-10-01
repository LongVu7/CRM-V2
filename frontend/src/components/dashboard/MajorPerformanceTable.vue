<template>
  <div class="chart-container bg-white dark:bg-gray-800 border rounded shadow-sm p-4 col-span-1 md:col-span-2">
    <h3 class="text-lg font-semibold mb-4">Thống kê tình trạng theo ngành</h3>
    <DataTable :value="majorPerformance" dataKey="majorKey" responsiveLayout="scroll">
      <Column v-for="col in COLUMNS" :key="col.field" :field="col.isRate ? undefined : col.field" :header="col.header"
        :class="col.class">
        <template #body="{ data }">
          <span :class="col.class">{{ col.isRate ? data[col.field] + '%' : data[col.field] }}</span>
        </template>
      </Column>

      <ColumnGroup type="footer">
        <Row>
          <Column footer="Tổng" class="font-bold" footerStyle="font-weight: bold" />
          <Column v-for="col in COLUMNS.slice(1)" :key="'footer-' + col.field"
            :footer="col.isRate ? totals[col.field] + '%' : totals[col.field]"
            :footerStyle="col.bold ? 'font-weight: bold' : undefined" />
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
import { PERFORMANCE_METRIC_COLUMNS } from '@/constants/report'
import { calcPerformanceTotals } from '@/utils/reportUtils'

const props = defineProps({
  majorPerformance: {
    type: Array,
    default: () => []
  }
})

const COLUMNS = [
  { field: 'majorLabel', header: 'Ngành', class: 'font-semibold' },
  ...PERFORMANCE_METRIC_COLUMNS
]

const totals = computed(() => calcPerformanceTotals(props.majorPerformance))
</script>

<template>
  <div class="chart-container bg-white dark:bg-gray-800 border rounded shadow-sm p-4 col-span-1 md:col-span-2">
    <h3 class="text-lg font-semibold mb-4">Thống kê tình trạng theo Tỉnh/TP</h3>
    <DataTable :value="regionPerformance" dataKey="regionGroup" responsiveLayout="scroll">
      <Column field="regionLabel" header="Tỉnh" class="font-semibold"></Column>
      <Column field="totalProcessed">
        <template #header>
          <span v-tooltip.top="'Tổng data - Tổng data xử lý'">Tổng data</span>
        </template>
      </Column>
      <Column field="interacted">
        <template #header>
          <span v-tooltip.top="'Tương tác - Tương tác được'">Tương tác</span>
        </template>
      </Column>
      <Column>
        <template #header>
          <span v-tooltip.top="'% TT - % tương tác được / Tổng data xử lý'">% TT</span>
        </template>
        <template #body="{ data }">
          <span>{{ data.interactionRate }}%</span>
        </template>
      </Column>
      <Column field="nb">
        <template #header>
          <span v-tooltip.top="'NB - Đã đóng phí (NB)'">NB</span>
        </template>
      </Column>
      <Column>
        <template #header>
          <span v-tooltip.top="'% NB - Tỷ lệ NB / Tương tác được'">% NB</span>
        </template>
        <template #body="{ data }">
          <span>{{ data.nbRate }}%</span>
        </template>
      </Column>
      <Column field="notInteracted">
        <template #header>
          <span v-tooltip.top="'Chưa TT - Chưa tương tác được'">Chưa TT</span>
        </template>
      </Column>
      <Column>
        <template #header>
          <span v-tooltip.top="'% Chưa TT - % chưa tương tác được / Tổng data xử lý'">% Chưa TT</span>
        </template>
        <template #body="{ data }">
          <span>{{ data.notInteractedRate }}%</span>
        </template>
      </Column>
      <Column>
        <template #header>
          <span v-tooltip.top="'% SS - % Sai số'">% SS</span>
        </template>
        <template #body="{ data }">
          <span>{{ data.wrongNumberRate }}%</span>
        </template>
      </Column>
      <Column>
        <template #header>
          <span v-tooltip.top="'% KQT - % Không quan tâm'">% KQT</span>
        </template>
        <template #body="{ data }">
          <span>{{ data.notInterestedRate }}%</span>
        </template>
      </Column>
      <Column field="unprocessed">
        <template #header>
          <span v-tooltip.top="'Chưa xử lý - Chưa xử lý'">Chưa xử lý</span>
        </template>
      </Column>

      <ColumnGroup type="footer">
        <Row>
          <Column footer="Tổng" class="font-bold" footerStyle="font-weight: bold" />
          <Column :footer="totals.totalProcessed" />
          <Column :footer="totals.interacted" />
          <Column :footer="totals.interactionRate + '%'" />
          <Column :footer="totals.nb" />
          <Column :footer="totals.nbRate + '%'" />
          <Column :footer="totals.notInteracted" />
          <Column :footer="totals.notInteractedRate + '%'" />
          <Column :footer="totals.wrongNumberRate + '%'" />
          <Column :footer="totals.notInterestedRate + '%'" />
          <Column :footer="totals.unprocessed" />
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
  regionPerformance: {
    type: Array,
    default: () => []
  }
})

const COLUMNS = [
  { field: 'regionLabel', header: 'Tỉnh', class: 'font-semibold' },
  ...PERFORMANCE_METRIC_COLUMNS
]

const totals = computed(() => calcPerformanceTotals(props.regionPerformance))
</script>

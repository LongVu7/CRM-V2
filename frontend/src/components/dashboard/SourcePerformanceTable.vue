<template>
  <div class="chart-container bg-white dark:bg-gray-800 border rounded shadow-sm p-4 col-span-1 md:col-span-2">
    <h3 class="text-lg font-semibold mb-4">Thống kê hiệu quả theo nguồn</h3>
    <DataTable :value="sourcePerformance" v-model:expandedRows="expandedRows" dataKey="sourceKey"
      responsiveLayout="scroll">
      <Column expander style="width: 3rem" />
      <Column field="sourceLabel" header="Nguồn" class="font-semibold"></Column>
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
          {{ data.interactionRate }}%
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
          {{ data.nbRate }}%
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
          {{ data.notInteractedRate }}%
        </template>
      </Column>
      <Column>
        <template #header>
          <span v-tooltip.top="'% SS - % Sai số'">% SS</span>
        </template>
        <template #body="{ data }">
          {{ data.wrongNumberRate }}%
        </template>
      </Column>
      <Column>
        <template #header>
          <span v-tooltip.top="'% KQT - % Không quan tâm'">% KQT</span>
        </template>
        <template #body="{ data }">
          {{ data.notInterestedRate }}%
        </template>
      </Column>
      <Column field="unprocessed">
        <template #header>
          <span v-tooltip.top="'Chưa xử lý - Chưa xử lý'">Chưa xử lý</span>
        </template>
      </Column>

      <!-- Expandable Source Details -->
      <template #expansion="slotProps">
        <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded my-2 ml-10 border border-gray-100 dark:border-gray-700">
          <DataTable :value="slotProps.data.details" dataKey="sourceDetailKey">
            <Column field="sourceDetailLabel" header="Nguồn chi tiết" class="font-semibold text-gray-600"></Column>
            <Column field="interacted">
              <template #header>
                <span v-tooltip.top="'Tương tác - Tương tác được'">Tương tác</span>
              </template>
            </Column>
            <Column>
              <template #header>
                <span v-tooltip.top="'% TT - % tương tác được'">% TT</span>
              </template>
              <template #body="{ data }">
                {{ data.interactionRate }}%
              </template>
            </Column>
            <Column field="nb">
              <template #header>
                <span v-tooltip.top="'NB - Đã đóng phí (NB)'">NB</span>
              </template>
            </Column>
            <Column>
              <template #header>
                <span v-tooltip.top="'% NB - Tỷ lệ NB'">% NB</span>
              </template>
              <template #body="{ data }">
                {{ data.nbRate }}%
              </template>
            </Column>
            <Column field="notInteracted">
              <template #header>
                <span v-tooltip.top="'Chưa TT - Chưa tương tác được'">Chưa TT</span>
              </template>
            </Column>
            <Column>
              <template #header>
                <span v-tooltip.top="'% Chưa TT - % chưa tương tác được'">% Chưa TT</span>
              </template>
              <template #body="{ data }">
                {{ data.notInteractedRate }}%
              </template>
            </Column>
            <Column>
              <template #header>
                <span v-tooltip.top="'% SS - % Sai số'">% SS</span>
              </template>
              <template #body="{ data }">
                {{ data.wrongNumberRate }}%
              </template>
            </Column>
            <Column>
              <template #header>
                <span v-tooltip.top="'% KQT - % Không quan tâm'">% KQT</span>
              </template>
              <template #body="{ data }">
                {{ data.notInterestedRate }}%
              </template>
            </Column>
            <Column field="unprocessed">
              <template #header>
                <span v-tooltip.top="'Chưa xử lý - Chưa xử lý'">Chưa xử lý</span>
              </template>
            </Column>
          </DataTable>
        </div>
      </template>

      <!-- Footer Tổng row -->
      <ColumnGroup type="footer">
        <Row>
          <Column footer="Tổng" frozen :colspan="2" class="font-bold" footerStyle="font-weight: bold" />
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
import { ref, computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ColumnGroup from 'primevue/columngroup'
import Row from 'primevue/row'
import { calcRate } from '@/utils/reportUtils'

const props = defineProps({
  sourcePerformance: {
    type: Array,
    default: () => []
  }
})

const expandedRows = ref([])

// Footer totals — sum top-level Source rows, then recalculate rates
const totals = computed(() => {
  let interacted = 0
  let nb = 0
  let notInteracted = 0
  let totalProcessed = 0
  let wrongNumber = 0
  let notInterested = 0
  let unprocessed = 0

  props.sourcePerformance.forEach(src => {
    totalProcessed += src.totalProcessed || 0
    interacted += src.interacted || 0
    nb += src.nb || 0
    notInteracted += src.notInteracted || 0
    wrongNumber += src.wrongNumber || 0
    notInterested += src.notInterested || 0
    unprocessed += src.unprocessed || 0
  })

  return {
    interacted,
    nb,
    notInteracted,
    unprocessed,
    interactionRate: calcRate(interacted, totalProcessed),
    nbRate: calcRate(nb, interacted),
    notInteractedRate: calcRate(notInteracted, totalProcessed),
    wrongNumberRate: calcRate(wrongNumber, totalProcessed),
    notInterestedRate: calcRate(notInterested, totalProcessed)
  }
})
</script>

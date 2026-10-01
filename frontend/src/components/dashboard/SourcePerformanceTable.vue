<template>
  <div class="chart-container bg-white dark:bg-gray-800 border rounded shadow-sm p-4 col-span-1 md:col-span-2">
    <h3 class="text-lg font-semibold mb-4">Thống kê hiệu quả theo nguồn</h3>
    <DataTable :value="sourcePerformance" v-model:expandedRows="expandedRows" dataKey="sourceKey"
      responsiveLayout="scroll">
      <Column expander style="width: 3rem" />
      <Column field="sourceLabel" header="Nguồn" class="font-semibold"></Column>
      <Column field="interacted" header="Tương tác được"></Column>
      <Column header="% tương tác được / Tổng data xử lý">
        <template #body="{ data }">
          {{ data.interactionRate }}%
        </template>
      </Column>
      <Column field="nb" header="Đã đóng phí (NB)"></Column>
      <Column header="Tỷ lệ NB / Tương tác được">
        <template #body="{ data }">
          {{ data.nbRate }}%
        </template>
      </Column>
      <Column field="notInteracted" header="Chưa tương tác được"></Column>
      <Column header="% chưa tương tác được / Tổng data xử lý">
        <template #body="{ data }">
          {{ data.notInteractedRate }}%
        </template>
      </Column>
      <Column header="% Sai số">
        <template #body="{ data }">
          {{ data.wrongNumberRate }}%
        </template>
      </Column>
      <Column header="% Không quan tâm">
        <template #body="{ data }">
          {{ data.notInterestedRate }}%
        </template>
      </Column>
      <Column field="unprocessed" header="Chưa xử lý"></Column>

      <!-- Expandable Source Details -->
      <template #expansion="slotProps">
        <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded my-2 ml-10 border border-gray-100 dark:border-gray-700">
          <DataTable :value="slotProps.data.details" dataKey="sourceDetailKey">
            <Column field="sourceDetailLabel" header="Nguồn chi tiết" class="font-semibold text-gray-600"></Column>
            <Column field="interacted" header="Tương tác được"></Column>
            <Column header="% tương tác được">
              <template #body="{ data }">
                {{ data.interactionRate }}%
              </template>
            </Column>
            <Column field="nb" header="Đã đóng phí (NB)"></Column>
            <Column header="Tỷ lệ NB">
              <template #body="{ data }">
                {{ data.nbRate }}%
              </template>
            </Column>
            <Column field="notInteracted" header="Chưa tương tác được"></Column>
            <Column header="% chưa tương tác được">
              <template #body="{ data }">
                {{ data.notInteractedRate }}%
              </template>
            </Column>
            <Column header="% Sai số">
              <template #body="{ data }">
                {{ data.wrongNumberRate }}%
              </template>
            </Column>
            <Column header="% Không quan tâm">
              <template #body="{ data }">
                {{ data.notInterestedRate }}%
              </template>
            </Column>
            <Column field="unprocessed" header="Chưa xử lý"></Column>
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

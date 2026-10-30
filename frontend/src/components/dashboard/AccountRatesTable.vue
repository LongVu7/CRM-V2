<template>
  <div class="chart-container bg-white dark:bg-gray-800 border rounded shadow-sm p-4 col-span-1 md:col-span-2">
    <h3 class="text-lg font-semibold mb-4">Thống kê tỷ lệ xử lý data</h3>
    <DataTable :value="ratesByAdvisor" dataKey="advisorId" responsiveLayout="scroll" :paginator="true" :rows="10">
      <Column field="advisorName" header="Tư vấn" class="font-semibold"></Column>
      <Column field="processed">
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
          <span v-tooltip.top="'% TT - % Tương tác được'">% TT</span>
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
      <Column>
        <template #header>
          <span v-tooltip.top="'% KQT - % Không quan tâm'">% KQT</span>
        </template>
        <template #body="{ data }">
          {{ data.notInterestedRate }}%
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
    </DataTable>
  </div>
</template>

<script setup>
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

defineProps({
  ratesByAdvisor: {
    type: Array,
    default: () => []
  }
})
</script>

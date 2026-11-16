<template>
  <div class="chart-container bg-white dark:bg-gray-800 border rounded shadow-sm p-4">
    <h3 class="text-lg font-semibold mb-4">Thống kê lead theo ngành</h3>
    <div class="chart-wrapper">
      <Chart type="doughnut" :data="chartData" :options="chartOptions" class="h-full" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Chart from 'primevue/chart'
import { tEnum } from '@/i18n'

const props = defineProps({
  byMajor: {
    type: Array,
    default: () => []
  }
})

const chartData = computed(() => {
  return {
    labels: props.byMajor.map(m => tEnum('majorInterest', m.majorKey)),
    datasets: [
      {
        data: props.byMajor.map(m => m.processed),
        backgroundColor: [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'
        ],
        hoverBackgroundColor: [
          '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0d9488'
        ]
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '40%',
  plugins: {
    legend: {
      position: 'bottom'
    }
  }
}
</script>

<style scoped>
.chart-wrapper {
  position: relative;
  height: 320px;
}

@media (max-width: 768px) {
  .chart-wrapper {
    height: 260px;
  }
}
</style>

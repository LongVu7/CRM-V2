<template>
  <div class="chart-container bg-white dark:bg-gray-800 border rounded shadow-sm p-4">
    <h3 class="text-lg font-semibold mb-4">Region (Processed vs Interacted)</h3>
    <Chart type="bar" :data="chartData" :options="chartOptions" class="h-80 w-full" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Chart from 'primevue/chart'

const props = defineProps({
  byRegion: {
    type: Array,
    default: () => []
  }
})

const chartData = computed(() => {
  return {
    labels: props.byRegion.map(r => r.regionLabel),
    datasets: [
      {
        label: 'Processed',
        backgroundColor: '#4f46e5',
        data: props.byRegion.map(r => r.processed)
      },
      {
        label: 'Interacted',
        backgroundColor: '#f59e0b',
        data: props.byRegion.map(r => r.interacted)
      }
    ]
  }
})

const chartOptions = {
  maintainAspectRatio: false,
  aspectRatio: 0.6,
  plugins: {
    legend: {
      position: 'bottom'
    }
  },
  scales: {
    x: {
      stacked: true,
    },
    y: {
      stacked: true,
      beginAtZero: true
    }
  }
}
</script>

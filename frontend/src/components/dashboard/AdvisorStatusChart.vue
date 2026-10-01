<template>
  <div class="chart-container bg-white dark:bg-gray-800 border rounded shadow-sm p-4 col-span-1 md:col-span-2">
    <h3 class="text-lg font-semibold mb-4">2. Biểu đồ tình trạng xử lý data</h3>

    <div class="chart-wrapper">
      <Chart type="bar" :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Chart from 'primevue/chart'
import { ADVISOR_STATUS_CONFIG } from '@/constants/report'

const props = defineProps({
  statusByAdvisor: {
    type: Array,
    default: () => []
  }
})

const chartData = computed(() => {
  const labels = props.statusByAdvisor.map(a => a.advisorName || 'Unknown')
  const mapData = (field) => props.statusByAdvisor.map(a => a[field] || 0)

  return {
    labels,
    datasets: ADVISOR_STATUS_CONFIG.map(status => ({
      label: status.alias,
      fullLabel: status.label,
      data: mapData(status.key),
      backgroundColor: status.color
    }))
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 30,
        boxHeight: 15,
        padding: 12
      }
    },
    tooltip: {
      mode: 'nearest',
      intersect: true,
      callbacks: {
        label: (context) => {
          const { label: alias, fullLabel } = context.dataset
          return `${alias} — ${fullLabel}: ${context.formattedValue}`
        }
      }
    }
  },
  scales: {
    x: {
      stacked: true,
      grid: {
        display: false
      }
    },
    y: {
      stacked: true,
      beginAtZero: true,
      ticks: {
        precision: 0,
        maxTicksLimit: 6
      }
    }
  }
}
</script>

<style scoped>
.chart-wrapper {
  position: relative;
  width: 100%;
  height: 340px;
}

@media (max-width: 768px) {
  .chart-wrapper {
    min-height: 300px;
  }
}
</style>

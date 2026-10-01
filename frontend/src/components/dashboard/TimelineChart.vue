<template>
  <div class="chart-container">
    <h3 class="chart-title">Timeline (Monthly)</h3>

    <div class="chart-wrapper">
      <Chart type="line" :data="chartData" :options="chartOptions" class="h-80 w-full" />
    </div>
  </div>  
</template>

<script setup>
import { computed } from 'vue'
import Chart from 'primevue/chart'

const props = defineProps({
  timeline: {
    type: Array,
    default: () => []
  }
})

const chartData = computed(() => {
  return {
    labels: props.timeline.map(t => t.month),
    datasets: [
      {
        label: 'Processed',
        data: props.timeline.map(t => t.processed),
        fill: false,
        borderColor: '#4f46e5',
        tension: 0.4
      },
      {
        label: 'Interacted',
        data: props.timeline.map(t => t.interacted),
        fill: false,
        borderColor: '#f59e0b',
        tension: 0.4
      },
      {
        label: 'NB',
        data: props.timeline.map(t => t.nb),
        fill: false,
        borderColor: '#10b981',
        tension: 0.4
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
    offset: true
  },
  y: {
    beginAtZero: true
  }
  }
}
</script>

<style scoped>
.chart-container {
  background: var(--p-content-background, #fff);
  border: 1px solid var(--p-surface-200, #e2e8f0);
  border-radius: 8px;
  padding: 1.5rem;

  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 360px;

  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.chart-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.chart-wrapper {
  position: relative;
  flex: 1;
  min-height: 0;
}

.chart-wrapper :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
}
</style>

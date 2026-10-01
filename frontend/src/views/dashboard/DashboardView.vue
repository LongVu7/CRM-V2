<template>
  <div class="dashboard-view p-4">
    <div class="header mb-4">
      <h2>Dashboard Report</h2>
    </div>

    <!-- Filters -->
    <DashboardFilters @filter-change="handleFilterChange" :loading="loading" />

    <!-- Loading template -->
    <div v-if="loading" class="text-center mt-4">
      <ProgressSpinner />
    </div>

    <!-- Error message -->
    <div v-else-if="error" class="text-red-500 mt-4 text-center">
      {{ error }}
    </div>

    <!-- Data template -->
    <div v-else-if="data" class="dashboard-content mt-4">
      <!-- Summary Cards -->
      <div class="overview-grid">
        <DashboardSummary :summary="data.summary" />
        <TimelineChart :timeline="data.timeline" />
      </div>

      <!-- Charts Section -->
      <div class="charts-grid mt-4">
        <!-- Thống kê tình trạng theo ngành -->
        <MajorChart :byMajor="data.byMajor" />
        <!-- Thống kê tình trạng theo Tỉnh/ TP -->
        <RegionChart :byRegion="data.byRegion" />
        <MajorPerformanceTable :majorPerformance="data.majorPerformance" />
        <!-- Thống kê tình trạng theo Nguồn -->
        <SourceChart :bySource="data.bySource" />
        <SourcePerformanceTable :sourcePerformance="data.sourcePerformance" />
        <!-- Thống kê tình trạng xử lý data (Chart and Table) -->
        <AdvisorStatusChart :statusByAdvisor="data.statusByAdvisor" />
        <AdvisorStatusTable :statusByAdvisor="data.statusByAdvisor" />
        
        <RegionPerformanceTable :regionPerformance="data.regionPerformance" />
        <AdvisorRatesChart :ratesByAdvisor="data.ratesByAdvisor" />
      </div>


    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useDashboard } from '@/composables/useDashboard'
import DashboardFilters from '@/components/dashboard/DashboardFilters.vue'
import DashboardSummary from '@/components/dashboard/DashboardSummary.vue'
import TimelineChart from '@/components/dashboard/TimelineChart.vue'
import MajorChart from '@/components/dashboard/MajorChart.vue'
import MajorPerformanceTable from '@/components/dashboard/MajorPerformanceTable.vue'
import RegionChart from '@/components/dashboard/RegionChart.vue'
import RegionPerformanceTable from '@/components/dashboard/RegionPerformanceTable.vue'
import SourceChart from '@/components/dashboard/SourceChart.vue'
import SourcePerformanceTable from '@/components/dashboard/SourcePerformanceTable.vue'
import AdvisorStatusChart from '@/components/dashboard/AdvisorStatusChart.vue'
import AdvisorStatusTable from '@/components/dashboard/AdvisorStatusTable.vue'
import AdvisorRatesChart from '@/components/dashboard/AdvisorRatesChart.vue'

import ProgressSpinner from 'primevue/progressspinner'

// Initial fetch with default filters handled by DashboardFilters
const { data, loading, error, fetchDashboard } = useDashboard()

const handleFilterChange = (filters) => {
  fetchDashboard(filters)
}

</script>

<style scoped>
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Summary + Timeline */
.overview-grid {
  display: grid;
  grid-template-columns:
    minmax(350px, 0.95fr) minmax(0, 2.15fr);

  gap: 1rem;
  align-items: stretch;
}

/* Other charts */
.charts-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 1024px) {
  .charts-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Tablet/mobile */
@media (max-width: 1023px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }
}
</style>

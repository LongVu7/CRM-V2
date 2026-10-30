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
        <!-- <RegionChart :byRegion="data.byRegion" /> -->
        <AccountStatusChart :statusByAccount="data.statusByAccount || data.statusByAdvisor" />
        <!-- Thống kê tình trạng xử lý data (Chart and Table) -->
        <AccountStatusTable :statusByAccount="data.statusByAccount || data.statusByAdvisor" />
        <!-- Thống kê tình trạng theo Tỉnh/ TP -->
        <MajorPerformanceTable :majorPerformance="data.majorPerformance" />
        <!-- Thống kê tình trạng theo Nguồn -->
        <SourceStatusTable :bySource="data.bySource" />
        <SourcePerformanceTable :sourcePerformance="data.sourcePerformance" />
        
        <RegionPerformanceTable :regionPerformance="data.regionPerformance" />
        <AccountRatesTable :ratesByAccount="data.ratesByAccount || data.ratesByAdvisor" />
      </div>


    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getDashboard } from '@/services/reportService'
import DashboardFilters from '@/components/dashboard/DashboardFilters.vue'
import DashboardSummary from '@/components/dashboard/DashboardSummary.vue'
import TimelineChart from '@/components/dashboard/TimelineChart.vue'
import MajorChart from '@/components/dashboard/MajorChart.vue'
import MajorPerformanceTable from '@/components/dashboard/MajorPerformanceTable.vue'
import RegionChart from '@/components/dashboard/RegionChart.vue'
import RegionPerformanceTable from '@/components/dashboard/RegionPerformanceTable.vue'
import SourceStatusTable from '@/components/dashboard/SourceStatusTable.vue'
import SourcePerformanceTable from '@/components/dashboard/SourcePerformanceTable.vue'
import AccountStatusChart from '@/components/dashboard/AccountStatusChart.vue'
import AccountStatusTable from '@/components/dashboard/AccountStatusTable.vue'
import AccountRatesTable from '@/components/dashboard/AccountRatesTable.vue'
import ProgressSpinner from 'primevue/progressspinner'

const data = ref(null)
const loading = ref(false)
const error = ref(null)

const handleFilterChange = async (filters = {}) => {
  loading.value = true
  error.value = null
  try {
    data.value = await getDashboard(filters)
  } catch (err) {
    error.value = err.response?.data?.error || err.message
  } finally {
    loading.value = false
  }
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

<template>
  <div class="dashboard-filters p-4 border rounded shadow-sm bg-white dark:bg-gray-800">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Date Range -->
      <div class="filter-group col-span-1 md:col-span-2">
        <label class="block text-sm font-medium mb-1">Date Range</label>
        <div class="flex gap-2">
          <DatePicker v-model="filters.from" dateFormat="yy-mm-dd" placeholder="From (YYYY-MM-DD)" class="w-full" showIcon />
          <DatePicker v-model="filters.to" dateFormat="yy-mm-dd" placeholder="To (YYYY-MM-DD)" class="w-full" showIcon />
        </div>
      </div>

      <!-- Sources -->
      <div class="filter-group">
        <label class="block text-sm font-medium mb-1">Source</label>
        <MultiSelect v-model="filters.sourceIds" :options="sources" optionLabel="label" optionValue="id" placeholder="All Sources" class="w-full" :loading="loadingSources" display="chip" />
      </div>

      <!-- Source Details -->
      <div class="filter-group">
        <label class="block text-sm font-medium mb-1">Source Detail</label>
        <MultiSelect v-model="filters.sourceDetailIds" :options="sourceDetails" optionLabel="label" optionValue="id" placeholder="All Details" class="w-full" :disabled="!filters.sourceIds?.length" display="chip" />
      </div>

      <!-- Major Interest -->
      <div class="filter-group">
        <label class="block text-sm font-medium mb-1">Major Interest</label>
        <MultiSelect v-model="filters.majorInterestTypes" :options="majorOptions" optionLabel="label" optionValue="value" placeholder="All Majors" class="w-full" display="chip" />
      </div>

      <!-- Region -->
      <div class="filter-group">
        <label class="block text-sm font-medium mb-1">Region</label>
        <MultiSelect v-model="filters.regionGroups" :options="regionOptions" optionLabel="label" optionValue="value" placeholder="All Regions" class="w-full" display="chip" />
      </div>

      <!-- Old Province -->
      <div class="filter-group">
        <label class="block text-sm font-medium mb-1">Old Province</label>
        <MultiSelect v-model="filters.oldProvinceIds" :options="oldProvinces" optionLabel="name" optionValue="id" placeholder="All Provinces" class="w-full" :loading="loadingOldProvinces" display="chip" filter />
      </div>

      <!-- Actions -->
      <div class="filter-group flex items-end">
        <Button label="Refresh" icon="pi pi-refresh" @click="emitFilters" :loading="loading" class="w-full" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import DatePicker from 'primevue/datepicker'
import MultiSelect from 'primevue/multiselect'
import Button from 'primevue/button'

import { useSourceData } from '@/composables/useSourceData'
import { getChildrenById } from '@/services/sourceDataService'
import { useSchoolOptions } from '@/composables/useSchoolOptions'
import { provinceGroupOptions } from '@/constants/region'
import { majorInterestOptions } from '@/constants/report'
import { formatDateYMD } from '@/utils/dateUtils'

const props = defineProps({
  loading: Boolean
})

const emit = defineEmits(['filter-change'])

const { 
  sources, 
  fetchSources
} = useSourceData()

const {
  oldProvinces,
  fetchOldProvinces,
  loadingOldProvinces
} = useSchoolOptions()

const loadingSources = ref(false)
const sourceDetails = ref([])

const majorOptions = majorInterestOptions
const regionOptions = provinceGroupOptions

const filters = ref({
  from: null,
  to: null,
  sourceIds: null,
  sourceDetailIds: null,
  majorInterestTypes: null,
  regionGroups: null,
  oldProvinceIds: null
})

const emitFilters = () => {
  const formatted = {
    ...filters.value,
    from: formatDateYMD(filters.value.from),
    to: formatDateYMD(filters.value.to)
  }
  emit('filter-change', formatted)
}

watch(() => filters.value.sourceIds, async (newVal) => {
  if (!newVal || newVal.length === 0) {
    sourceDetails.value = []
    filters.value.sourceDetailIds = null
    return
  }
  
  // Fetch details for all selected root sources
  const details = []
  for (const sourceId of newVal) {
    const children = await getChildrenById(sourceId)
    details.push(...children)
  }
  sourceDetails.value = details
  
  // Remove selected details that no longer belong to selected sources
  if (filters.value.sourceDetailIds) {
    const validIds = new Set(details.map(d => d.id))
    filters.value.sourceDetailIds = filters.value.sourceDetailIds.filter(id => validIds.has(id))
  }
})

onMounted(async () => {
  loadingSources.value = true
  try {
    await Promise.all([
      fetchSources(),
      fetchOldProvinces()
    ])
  } catch (error) {
    console.error('Failed to load filter options:', error)
  } finally {
    loadingSources.value = false
  }
  
  // Default to 1st of current month to today
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  
  filters.value.from = firstDay
  filters.value.to = today
  
  emitFilters()
})
</script>

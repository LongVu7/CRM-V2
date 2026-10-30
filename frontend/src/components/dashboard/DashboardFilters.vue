<template>
  <div class="dashboard-filters p-4 border rounded shadow-sm bg-white dark:bg-gray-800">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Date Range -->
      <div class="filter-group col-span-1 md:col-span-2">
        <label class="block text-sm font-medium mb-1">Date Range</label>
        <div class="flex gap-2">
          <DatePicker v-model="filters.from" dateFormat="dd/mm/yy" placeholder="From (DD/MM/YYYY)" class="w-full" showIcon />
          <DatePicker v-model="filters.to" dateFormat="dd/mm/yy" placeholder="To (DD/MM/YYYY)" class="w-full" showIcon />
        </div>
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
import { ref, onMounted } from 'vue'
import DatePicker from 'primevue/datepicker'
import MultiSelect from 'primevue/multiselect'
import Button from 'primevue/button'

import { useSchoolOptions } from '@/composables/useSchoolOptions'
import { formatDateYMD } from '@/utils/dateUtils'

defineProps({
  loading: Boolean
})

const emit = defineEmits(['filter-change'])

const {
  oldProvinces,
  fetchOldProvinces,
  loadingOldProvinces
} = useSchoolOptions()

const filters = ref({
  from: null,
  to: null,
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

onMounted(async () => {
  fetchOldProvinces().catch(err => console.error('Failed to load provinces:', err))

  // Default to 1st of current month to today
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)

  filters.value.from = firstDay
  filters.value.to = today

  emitFilters()
})
</script>

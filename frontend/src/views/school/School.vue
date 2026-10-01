<template>
  <div class="school-list-view">
    <div class="page-header">
      <div class="header-left">
        <h1><i class="pi pi-building"></i> School Management</h1>
        <Tag :value="`${pagination?.totalCount || 0} schools`" severity="info" rounded />
      </div>
      <div class="header-actions">
        <Button label="New School" icon="pi pi-plus" @click="$router.push('/schools/new')" />
      </div>
    </div>

    <SchoolList
      :schools="schools"
      :loading="loading"
      :pagination="pagination"
      @page-change="onPageChange"
      @search="onSearch"
      @old-province-filter="onOldProvinceFilter"
      @delete="onDelete"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import SchoolList from '@/components/school/SchoolList.vue'
import { useSchool } from '@/composables/useSchool'
import { useToast } from 'primevue/usetoast'

const { schools, pagination, loading, fetchSchools, deleteSchool } = useSchool()
const toast = useToast()

const currentParams = ref({ page: 1, limit: 20, search: '', oldProvinceId: null })

onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  try {
    const params = { ...currentParams.value }
    if (!params.oldProvinceId) delete params.oldProvinceId
    if (!params.search) delete params.search
    await fetchSchools(params)
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load schools', life: 5000 })
  }
}

const onPageChange = async ({ page, limit }) => {
  currentParams.value.page = page
  currentParams.value.limit = limit
  await loadData()
}

const onSearch = async (searchQuery) => {
  currentParams.value.search = searchQuery
  currentParams.value.page = 1
  await loadData()
}

const onOldProvinceFilter = async (oldProvinceId) => {
  currentParams.value.oldProvinceId = oldProvinceId
  currentParams.value.page = 1
  await loadData()
}

const onDelete = async (id) => {
  try {
    await deleteSchool(id)
    toast.add({ severity: 'success', summary: 'Deleted', detail: 'School has been deleted', life: 3000 })
    await loadData()
  } catch (e) {
    const detail = e.response?.data?.error || 'Failed to delete school'
    toast.add({ severity: 'error', summary: 'Error', detail, life: 5000 })
  }
}
</script>

<style scoped>
.school-list-view { padding: 1.5rem 2rem; max-width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
.header-left { display: flex; align-items: center; gap: 0.75rem; }
.header-left h1 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--p-text-color); }
.header-left h1 i { color: var(--p-primary-color); }
.header-actions { display: flex; gap: 0.5rem; }

@media (max-width: 768px) {
  .school-list-view { padding: 1rem; }
  .page-header { flex-direction: column; align-items: flex-start; }
}
</style>

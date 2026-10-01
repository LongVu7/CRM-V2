<template>
  <div class="student-list-view">
    <div class="page-heading">
      <div class="flex-heading">
        <h1><i class="pi pi-graduation-cap"></i> Student Management</h1>
        <Tag :value="`${pagination?.totalCount || 0} students`" severity="info" rounded />
      </div>
    </div>

    <StudentList :students="students" :loading="loading" :exporting="exporting" :pagination="pagination" @page-change="onPageChange"
      @search="onSearch" @delete="onDelete" @sort="onSort" @filter="onFilter" @show="onShow"
      @open-import="showImportDialog = true" @export="onExport" />

    <StudentShowDialog v-model:visible="showDialogVisible" :studentId="showDialogStudentId" />

    <StudentImportDialog v-model:visible="showImportDialog" @success="onImportSuccess" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import Tag from 'primevue/tag'
import StudentList from '@/components/student/StudentList.vue'
import StudentShowDialog from '@/components/student/StudentShowDialog.vue'
import StudentImportDialog from '@/components/student/StudentImportDialog.vue'
import { useStudent } from '@/composables/useStudent'
import { exportStudents } from '@/services/studentService'
import { useToast } from 'primevue/usetoast'

const { students, pagination, loading, fetchStudents, deleteStudent } = useStudent()
const toast = useToast()

const currentParams = ref({
  page: 1, limit: 20, search: '', sortField: null, sortOrder: null,
  oldProvinceId: null, birthYear: null
})

// Show dialog state
const showDialogVisible = ref(false)
const showDialogStudentId = ref(null)
const showImportDialog = ref(false)
const exporting = ref(false)

onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  try {
    await fetchStudents(currentParams.value)
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load students', life: 5000 })
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

const onSort = async ({ sortField, sortOrder }) => {
  currentParams.value.sortField = sortField
  currentParams.value.sortOrder = sortOrder
  currentParams.value.page = 1
  await loadData()
}

const onFilter = async (filters) => {
  currentParams.value = { ...currentParams.value, ...filters, page: 1 }
  await loadData()
}

const onDelete = async (id) => {
  try {
    await deleteStudent(id)
    toast.add({ severity: 'success', summary: 'Deleted', detail: 'Student has been deleted', life: 3000 })
    await loadData()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete student', life: 5000 })
  }
}

const onShow = (studentId) => {
  showDialogStudentId.value = studentId
  showDialogVisible.value = true
}

const onImportSuccess = async () => {
  // Reload the data if import was successful
  currentParams.value.page = 1
  await loadData()
}

const onExport = async () => {
  if (exporting.value) return
  exporting.value = true
  try {
    const data = await exportStudents(currentParams.value)
    const url = window.URL.createObjectURL(new Blob([data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `students-${new Date().toISOString().split('T')[0]}.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    toast.add({ severity: 'success', summary: 'Success', detail: 'Export downloaded successfully', life: 3000 })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to export students', life: 5000 })
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.student-list-view {
  padding: 1.5rem 2rem;
  max-width: 100%;
}

.page-heading {
  margin-bottom: 1.5rem;
}

.flex-heading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.flex-heading h1 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--p-text-color);
}

.flex-heading h1 i {
  color: var(--p-primary-color);
}

@media (max-width: 768px) {
  .student-list-view {
    padding: 1rem;
  }
}
</style>

<template>
  <div class="student-detail">
    <div class="page-header">
      <h1>Edit Student</h1>
      <Button label="Back to List" severity="secondary" icon="pi pi-arrow-left" @click="$router.push('/students')" />
    </div>

    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <p>Loading student data...</p>
    </div>

    <div v-else-if="notFound" class="empty-state">
      <i class="pi pi-exclamation-triangle"></i>
      <h3>Student Not Found</h3>
      <p>The student you are looking for does not exist.</p>
      <Button label="Back to List" icon="pi pi-arrow-left" @click="$router.push('/students')" />
    </div>

    <div v-else-if="student" class="section-card">
      <h2>Student Information</h2>
      <StudentForm
        :student="student"
        :isSubmitting="isSubmitting"
        buttonText="Update Student"
        @submit="updateExistingStudent"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import StudentForm from '@/components/student/StudentForm.vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useStudent } from '@/composables/useStudent'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const { student, loading, error, fetchStudentById, updateStudent } = useStudent()

const notFound = ref(false)
const isSubmitting = ref(false)

onMounted(async () => {
  const id = route.params.id
  try {
    const data = await fetchStudentById(id)
    if (data.birthDate) student.value.birthDate = new Date(data.birthDate)
    if (data.schoolId) student.value.schoolId = data.schoolId
    if (!student.value.specializedRegister) {
      student.value.specializedRegister = {}
    }
  } catch (err) {
    notFound.value = true
  }
})

const updateExistingStudent = async (payload) => {
  isSubmitting.value = true
  try {
    const id = route.params.id
    await updateStudent(id, payload)
    toast.add({ severity: 'success', summary: 'Updated', detail: `Student "${payload.fullName}" updated successfully`, life: 3000 })
    router.push('/students')
  } catch (error) {
    const detail = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to update student'
    toast.add({ severity: 'error', summary: 'Error', detail, life: 5000 })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.student-detail {
  padding: 1.5rem 2rem;
  max-width: 900px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--p-text-color);
}

.section-card {
  background: var(--p-content-background);
  border: 1px solid var(--p-surface-200);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.section-card h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1.25rem 0;
  color: var(--p-text-color);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem 1rem;
  gap: 0.75rem;
  color: var(--p-text-muted-color);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem 1rem;
  gap: 0.5rem;
  color: var(--p-text-muted-color);
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  color: var(--p-orange-400);
}

.empty-state h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.empty-state p {
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
}
</style>

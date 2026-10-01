<template>
  <div class="student-new-view">
    <div class="page-header">
      <h1>Add New Student</h1>
      <Button label="Back to List"
        severity="secondary"
        icon="pi pi-arrow-left"
        @click="$router.push('/students')"
      />
    </div>

    <div class="section-card">
      <h2>Student Information</h2>
      <StudentForm
        :student="studentTemplate"
        :isSubmitting="isSubmitting"
        buttonText="Create Student"
        @submit="createNewStudent"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import StudentForm from '@/components/student/StudentForm.vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useStudent } from '@/composables/useStudent'

const router = useRouter()
const toast = useToast()
const { createStudent } = useStudent()

const isSubmitting = ref(false)

const studentTemplate = ref({
  fullName: '',
  gender: null,
  email: '',
  mobile: '',
  otherPhone: '',
  birthDate: null,
  parentPhone: '',
  primaryAddress: '',
  schoolId: null,

  specializedRegister: {
    interestedMajor: '',
    specificMajor: '',
    admissionYear: null,
    englishCertificate: null,
    gpa: null,
    programScore: null
  }
})

const createNewStudent = async (payload) => {
  isSubmitting.value = true
  try {
    await createStudent(payload)
    toast.add({ severity: 'success', summary: 'Created', detail: `Student "${payload.fullName}" created successfully`, life: 3000 })
    router.push('/students')
  } catch (error) {
    const detail = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to create student'
    toast.add({ severity: 'error', summary: 'Error', detail, life: 5000 })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.student-new-view {
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
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.section-card h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1.25rem 0;
  color: var(--p-text-color);
}
</style>

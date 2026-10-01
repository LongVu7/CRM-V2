<template>
  <div class="school-new-view">
    <div class="page-header">
      <h1>Add New School</h1>
      <Button label="Back to List" severity="secondary" icon="pi pi-arrow-left" @click="$router.push('/schools')" />
    </div>

    <div class="section-card">
      <h2>School Information</h2>
      <SchoolForm
        :school="schoolTemplate"
        :isSubmitting="isSubmitting"
        buttonText="Create School"
        @submit="createNewSchool"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import SchoolForm from '@/components/school/SchoolForm.vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useSchool } from '@/composables/useSchool'

const router = useRouter()
const toast = useToast()
const { createSchool } = useSchool()

const isSubmitting = ref(false)

const schoolTemplate = ref({
  name: '',
  cityId: null,
  schoolType: null
})

const createNewSchool = async (payload) => {
  isSubmitting.value = true
  try {
    await createSchool(payload)
    toast.add({ severity: 'success', summary: 'Created', detail: `School "${payload.name}" created successfully`, life: 3000 })
    router.push('/schools')
  } catch (error) {
    const detail = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to create school'
    toast.add({ severity: 'error', summary: 'Error', detail, life: 5000 })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.school-new-view {
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

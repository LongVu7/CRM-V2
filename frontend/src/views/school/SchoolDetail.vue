<template>
  <div class="school-detail">
    <div class="page-header">
      <h1>Edit School</h1>
      <Button label="Back to List" severity="secondary" icon="pi pi-arrow-left" @click="$router.push('/schools')" />
    </div>

    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <p>Loading school data...</p>
    </div>

    <div v-else-if="notFound" class="empty-state">
      <i class="pi pi-exclamation-triangle"></i>
      <h3>School Not Found</h3>
      <p>The school you are looking for does not exist.</p>
      <Button label="Back to List" icon="pi pi-arrow-left" @click="$router.push('/schools')" />
    </div>

    <div v-else-if="school" class="section-card">
      <h2>School Information</h2>
      <SchoolForm
        :school="school"
        :isSubmitting="isSubmitting"
        buttonText="Update School"
        @submit="updateExistingSchool"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import SchoolForm from '@/components/school/SchoolForm.vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useSchool } from '@/composables/useSchool'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const { school, loading, fetchSchoolById, updateSchool } = useSchool()

const notFound = ref(false)
const isSubmitting = ref(false)

onMounted(async () => {
  const id = route.params.id
  try {
    await fetchSchoolById(id)
  } catch (err) {
    notFound.value = true
  }
})

const updateExistingSchool = async (payload) => {
  isSubmitting.value = true
  try {
    const id = route.params.id
    await updateSchool(id, payload)
    toast.add({ severity: 'success', summary: 'Updated', detail: `School "${payload.name}" updated successfully`, life: 3000 })
    router.push('/schools')
  } catch (error) {
    const detail = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to update school'
    toast.add({ severity: 'error', summary: 'Error', detail, life: 5000 })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.school-detail {
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

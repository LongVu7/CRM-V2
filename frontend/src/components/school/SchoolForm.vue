<template>
  <form @submit.prevent="onSubmit" class="school-form">
    <div class="form-grid">
      <div class="form-field">
        <label for="schf-name">School Name <span class="required">*</span></label>
        <InputText id="schf-name" v-model="form.name" placeholder="Enter school name" :invalid="!!errors.name" fluid />
        <small v-if="errors.name" class="form-error">{{ errors.name }}</small>
      </div>
      <div class="form-field">
        <label for="schf-oldProvince">Old Province <span class="required">*</span></label>
        <Select id="schf-oldProvince" v-model="form.oldProvinceId" :options="oldProvinces" optionLabel="name" optionValue="id"
          placeholder="Select old province" :loading="loadingOldProvinces" :invalid="!!errors.oldProvinceId" filter fluid />
        <small v-if="errors.oldProvinceId" class="form-error">{{ errors.oldProvinceId }}</small>
      </div>
    </div>

    <div class="form-grid">
      <div class="form-field">
        <label for="schf-type">School Type</label>
        <Select id="schf-type" v-model="form.schoolType" :options="schoolTypeOptions" optionLabel="label" optionValue="value"
          placeholder="Select type" showClear fluid />
      </div>
    </div>

    <div class="form-actions" v-if="!hideSubmit">
      <Button type="submit" :label="buttonText" icon="pi pi-check" :loading="isSubmitting" />
    </div>
  </form>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import { useSchoolOptions } from '@/composables/useSchoolOptions'
import { schoolTypeOptions } from '@/constants/school'

const props = defineProps({
  school: { type: Object, required: true },
  isSubmitting: { type: Boolean, default: false },
  buttonText: { type: String, default: 'Submit' },
  hideSubmit: { type: Boolean, default: false }
})

const emit = defineEmits(['submit'])

const { oldProvinces, loadingOldProvinces, fetchOldProvinces } = useSchoolOptions()

const form = ref({ ...props.school })
const errors = ref({})

watch(() => props.school, (newVal) => {
  form.value = { ...newVal }
  errors.value = {}
}, { deep: true })

onMounted(() => {
  fetchOldProvinces()
})

const validate = () => {
  const e = {}
  if (!form.value.name || !form.value.name.trim()) e.name = 'School name is required'
  if (!form.value.oldProvinceId) e.oldProvinceId = 'Old Province is required'
  errors.value = e
  return Object.keys(e).length === 0
}

const getPayload = () => {
  const payload = {}
  for (const [key, value] of Object.entries(form.value)) {
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt' || key === 'oldProvince') continue
    if (value !== '' && value !== null && value !== undefined) {
      payload[key] = value
    }
  }
  return payload
}

const onSubmit = () => {
  if (!validate()) return
  emit('submit', getPayload())
}
</script>

<style scoped>
.school-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-field label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.required {
  color: var(--p-red-400);
}

.form-error {
  color: var(--p-red-400);
  font-size: 0.75rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>

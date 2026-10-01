<template>
  <div class="role-form-fields">
    <div class="form-grid">
      <div class="form-field">
        <label>Role Name</label>
        <InputText v-model="localForm.name" placeholder="e.g. manager, editor" fluid />
      </div>
      <div class="form-field">
        <label>Description</label>
        <InputText v-model="localForm.description" placeholder="Optional description" fluid />
      </div>
    </div>

    <div class="form-section">
      <h3><i class="pi pi-shield"></i> Privileges</h3>
      <PermissionMatrix v-model="localForm.permissionIds" />
    </div>

    <div class="form-actions">
      <Button
        :label="isEditing ? 'Update Role' : 'Create Role'"
        icon="pi pi-check"
        @click="handleSubmit"
        :loading="isSubmitting"
      />
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import PermissionMatrix from '@/components/shared/PermissionMatrix.vue'

const props = defineProps({
  role: { type: Object, default: () => ({ name: '', description: '', permissionIds: [] }) },
  isSubmitting: { type: Boolean, default: false },
  isEditing: { type: Boolean, default: false }
})

const emit = defineEmits(['submit'])

const localForm = reactive({
  name: props.role.name || '',
  description: props.role.description || '',
  permissionIds: [...(props.role.permissionIds || [])]
})

watch(() => props.role, (newVal) => {
  localForm.name = newVal.name || ''
  localForm.description = newVal.description || ''
  localForm.permissionIds = [...(newVal.permissionIds || [])]
}, { deep: true })

const handleSubmit = () => {
  emit('submit', {
    name: localForm.name,
    description: localForm.description,
    permissionIds: localForm.permissionIds
  })
}
</script>

<style scoped>
.role-form-fields {
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

.form-section h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-color);
}

.form-section h3 i {
  color: var(--p-primary-color);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--p-surface-200);
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>

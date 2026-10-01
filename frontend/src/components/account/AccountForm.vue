
<template>
  <form @submit.prevent="onSubmit" class="account-form">
    <div class="form-grid">
      <div class="form-field">
        <label for="af-fullName">Full Name <span class="required">*</span></label>
        <InputText id="af-fullName" v-model="form.fullName" placeholder="Enter full name" :invalid="!!errors.fullName" fluid />
        <small v-if="errors.fullName" class="form-error">{{ errors.fullName }}</small>
      </div>
      <div class="form-field">
        <label for="af-email">Email <span class="required">*</span></label>
        <InputText id="af-email" v-model="form.email" placeholder="user@email.com" :invalid="!!errors.email" fluid />
        <small v-if="errors.email" class="form-error">{{ errors.email }}</small>
      </div>
    </div>

    <div class="form-grid">
      <div class="form-field">
        <label for="af-password">
          {{ isEditing ? 'New Password' : 'Password' }} 
          <span v-if="!isEditing" class="required">*</span>
          <span v-else style="font-size: 0.75rem; color: var(--p-text-muted-color); font-weight: normal; margin-left: 0.25rem;">(Leave blank to keep unchanged)</span>
        </label>
        <InputText id="af-password" v-model="form.password" type="password" placeholder="Min 6 characters" :invalid="!!errors.password" fluid />
        <small v-if="errors.password" class="form-error">{{ errors.password }}</small>
      </div>
      <div class="form-field"></div>
    </div>

    <div class="form-grid">
      <div class="form-field">
        <label for="af-role">Role</label>
        <Select id="af-role" v-model="form.roleId" :options="roleOptions" optionLabel="label" optionValue="value" placeholder="Select role" showClear fluid />
      </div>
      <div class="form-field">
        <label for="af-group">Group</label>
        <Select id="af-group" v-model="form.groupId" :options="groupOptions" optionLabel="label" optionValue="value" placeholder="Select group" showClear fluid />
      </div>
    </div>

    <div class="form-grid" v-if="isEditing">
      <div class="form-field">
        <label for="af-active">Active Status</label>
        <div class="toggle-row">
          <ToggleSwitch id="af-active" v-model="form.isActive" />
          <span class="toggle-label">{{ form.isActive ? 'Active' : 'Inactive' }}</span>
        </div>
      </div>
      <div class="form-field"></div>
    </div>

    <div class="form-actions">
      <Button type="submit" :label="buttonText" icon="pi pi-check" :loading="isSubmitting" />
    </div>
  </form>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'
import { isValidEmail } from '@/utils/validationUtils'

const props = defineProps({
  account: { type: Object, required: true },
  roles: { type: Array, default: () => [] },
  groups: { type: Array, default: () => [] },
  isSubmitting: { type: Boolean, default: false },
  buttonText: { type: String, default: 'Submit' },
  isEditing: { type: Boolean, default: false }
})

const emit = defineEmits(['submit'])

const form = ref({ ...props.account })
const errors = ref({})

watch(() => props.account, (newVal) => {
  form.value = { ...newVal }
  errors.value = {}
}, { deep: true })

const roleOptions = computed(() =>
  props.roles.map(r => ({ label: r.name, value: r.id }))
)

const groupOptions = computed(() =>
  props.groups.map(g => ({ label: g.name, value: g.id }))
)

const validate = () => {
  const e = {}
  if (!form.value.fullName || !form.value.fullName.trim()) e.fullName = 'Full name is required'
  if (!form.value.email || !form.value.email.trim()) {
    e.email = 'Email is required'
  } else if (!isValidEmail(form.value.email)) {
    e.email = 'Invalid email format'
  }
  if (!props.isEditing) {
    if (!form.value.password || form.value.password.length < 6) {
      e.password = 'Password must be at least 6 characters'
    }
  } else {
    if (form.value.password && form.value.password.length < 6) {
      e.password = 'Password must be at least 6 characters'
    }
  }
  errors.value = e
  return Object.keys(e).length === 0
}

const getPayload = () => {
  const payload = {}
  if (form.value.fullName) payload.fullName = form.value.fullName.trim()
  if (form.value.email) payload.email = form.value.email.trim()
  if (form.value.password) payload.password = form.value.password
  if (form.value.roleId !== undefined) payload.roleId = form.value.roleId
  if (form.value.groupId !== undefined) payload.groupId = form.value.groupId
  if (props.isEditing && form.value.isActive !== undefined) payload.isActive = form.value.isActive
  return payload
}

const onSubmit = () => {
  if (!validate()) return
  emit('submit', getPayload())
}
</script>


<style scoped>
.account-form {
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

.toggle-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.25rem;
}

.toggle-label {
  font-size: 0.9rem;
  color: var(--p-text-color);
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

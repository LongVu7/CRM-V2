<template>
  <form @submit.prevent="onSubmit" class="team-form">
    <div class="form-grid">
      <div class="form-field">
        <label for="tf-name">Team Name <span class="required">*</span></label>
        <InputText id="tf-name" v-model="form.name" placeholder="Enter team name" :invalid="!!errors.name" fluid />
        <small v-if="errors.name" class="form-error">{{ errors.name }}</small>
      </div>

      <div class="form-field">
        <label for="tf-parent">Part of another team?</label>

        <div v-if="selectedParentName && !showParentSelect" class="parent-team-badge">
          <div class="parent-team-info">
            <i class="pi pi-sitemap"></i>
            <span>Sub-team of <strong>{{ selectedParentName }}</strong></span>
          </div>
          <div class="parent-team-actions">
            <Button label="Change" text size="small" icon="pi pi-pencil" @click="showParentSelect = true" />
            <Button label="Make independent" text severity="secondary" size="small" icon="pi pi-times" @click="form.parentId = null" />
          </div>
        </div>

        <Select
          v-else
          id="tf-parent"
          v-model="form.parentId"
          :options="parentTeamOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="No – this is an independent team"
          showClear
          fluid
        />
        <small class="form-hint">Leaders of the parent team will also be able to oversee this team.</small>
      </div>

      <div class="form-field">
        <label for="tf-leader">Team Leader</label>
        <Select
          id="tf-leader"
          v-model="form.leaderId"
          :options="leaderOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select a team leader"
          showClear
          fluid
        />
      </div>

      <div class="form-field full-width">
        <label for="tf-description">Description</label>
        <InputText id="tf-description" v-model="form.description" placeholder="Brief description of the team's operational scope or territory" fluid />
      </div>
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
import Button from 'primevue/button'

const props = defineProps({
  team: { type: Object, required: true },
  parentOptions: { type: Array, default: () => [] },
  teams: { type: Array, default: () => [] },
  accounts: { type: Array, default: () => [] },
  isSubmitting: { type: Boolean, default: false },
  buttonText: { type: String, default: 'Submit' }
})

const emit = defineEmits(['submit'])

const form = ref({
  name: props.team.name || '',
  description: props.team.description || '',
  parentId: props.team.parentId ?? null,
  leaderId: props.team.leaderId ?? null
})
const errors = ref({})

watch(() => props.team, (newVal) => {
  form.value = {
    name: newVal.name || '',
    description: newVal.description || '',
    parentId: newVal.parentId ?? null,
    leaderId: newVal.leaderId ?? null
  }
  errors.value = {}
}, { deep: true })

const leaderOptions = computed(() =>
  props.accounts.map(acc => {
    const roleStr = acc.role?.name ? ` - ${acc.role.name}` : ''
    return {
      label: acc.fullName ? `${acc.fullName} (${acc.email}${roleStr})` : `${acc.email}${roleStr}`,
      value: acc.id
    }
  })
)

// Parent team candidates pre-processed and provided directly by the backend API
const parentTeamOptions = computed(() => {
  const source = (props.parentOptions && props.parentOptions.length > 0) ? props.parentOptions : props.teams
  return source.map(t => ({
    label: t.name,
    value: t.id
  }))
})

const showParentSelect = ref(false)

const selectedParentName = computed(() => {
  if (!form.value.parentId) return null
  const found = parentTeamOptions.value.find(p => p.value === form.value.parentId)
  return found?.label || null
})

const validate = () => {
  const e = {}
  if (!form.value.name || !form.value.name.trim()) {
    e.name = 'Team name is required'
  }
  if (props.team?.id && form.value.parentId === props.team.id) {
    e.parentId = 'A team cannot be its own parent'
  }
  errors.value = e
  return Object.keys(e).length === 0
}

const getPayload = () => {
  return {
    name: form.value.name.trim(),
    description: form.value.description?.trim() || null,
    parentId: form.value.parentId || null,
    leaderId: form.value.leaderId || null
  }
}

const onSubmit = () => {
  if (!validate()) return
  emit('submit', getPayload())
}
</script>

<style scoped>
.team-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.form-field.full-width {
  grid-column: span 2;
}

.form-field label {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--p-text-color);
}

.required {
  color: var(--p-red-500);
}

.form-error {
  color: var(--p-red-500);
  font-size: 0.8rem;
}

.form-hint {
  color: var(--p-text-muted-color);
  font-size: 0.78rem;
}

.parent-team-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.45rem 0.75rem;
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
  font-size: 0.875rem;
  flex-wrap: wrap;
}

.parent-team-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-color);
}

.parent-team-info i {
  color: var(--p-primary-color);
}

.parent-team-actions {
  display: flex;
  gap: 0.25rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.5rem;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .form-field.full-width {
    grid-column: span 1;
  }
}
</style>

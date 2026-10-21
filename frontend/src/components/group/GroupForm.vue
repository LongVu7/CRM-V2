<template>
  <form @submit.prevent="onSubmit" class="group-form">
    <div class="form-grid">
      <div class="form-field">
        <label for="gf-name">Group Name <span class="required">*</span></label>
        <InputText id="gf-name" v-model="form.name" placeholder="Enter group name" :invalid="!!errors.name" fluid />
        <small v-if="errors.name" class="form-error">{{ errors.name }}</small>
      </div>

      <div class="form-field" v-tooltip="!canManageLeader ? 'Only System Administrators can assign or replace a Group Leader' : null">
        <label for="gf-leader">
          Group Leader
          <span v-if="!canManageLeader" class="admin-only-tag"><i class="pi pi-lock"></i> Admin Only</span>
        </label>
        <Select
          id="gf-leader"
          v-model="form.groupLeaderId"
          :options="leaderOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select a group leader"
          :disabled="!canManageLeader"
          showClear
          fluid
        />
        <small v-if="!canManageLeader" class="field-hint">
          Only System Administrators can designate or replace a Group Leader.
        </small>
      </div>
    </div>

    <div class="form-section">
      <h3>
        <i class="pi pi-shield"></i> Group Privileges (Optional)
        <span v-if="!canManagePermissions" class="admin-only-tag"><i class="pi pi-lock"></i> Read-Only</span>
      </h3>
      <p class="section-hint" v-if="canManagePermissions">Assign operational permissions to all members of this group.</p>
      <p class="section-hint" v-else>Group permissions are governed exclusively by System Administrators and are displayed here as read-only.</p>
      <PermissionMatrix v-model="form.permissionIds" :disabled="!canManagePermissions" :fetchFn="getGroupPermissions" />
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
import PermissionMatrix from '@/components/shared/PermissionMatrix.vue'
import { getGroupPermissions } from '@/services/groupService'
import { useAuthStore } from '@/stores/auth'
import { useAbility } from '@casl/vue'

const props = defineProps({
  group: { type: Object, required: true },
  accounts: { type: Array, default: () => [] },
  isSubmitting: { type: Boolean, default: false },
  buttonText: { type: String, default: 'Submit' }
})

const emit = defineEmits(['submit'])

const authStore = useAuthStore()
const { can } = useAbility()

const canManageLeader = computed(() => {
  return authStore.user?.roleName === 'admin' || can('leader.assign', 'group')
})

const canManagePermissions = computed(() => {
  return authStore.user?.roleName === 'admin' || can('permission.assign', 'group')
})

const form = ref({ ...props.group, permissionIds: [...(props.group.permissionIds || [])] })
const errors = ref({})

watch(() => props.group, (newVal) => {
  form.value = { ...newVal, permissionIds: [...(newVal.permissionIds || [])] }
  errors.value = {}
}, { deep: true })

const leaderOptions = computed(() =>
  props.accounts.map(acc => {
    const currentGroupBadge = acc.group?.name ? ` [Group: ${acc.group.name}]` : ' (Unassigned)'
    const leadingGroup = acc.leadingGroups?.find(g => g.id !== Number(props.group?.id))

    return {
      label: `Account: ${acc.fullName || 'Account #' + acc.id}${currentGroupBadge}`,
      value: acc.id,
      disabled: Boolean(leadingGroup)
    }
  })
)

const validate = () => {
  const e = {}
  if (!form.value.name || !form.value.name.trim()) {
    e.name = 'Group name is required'
  }
  errors.value = e
  return Object.keys(e).length === 0
}

const getPayload = () => {
  const payload = {}
  payload.name = form.value.name.trim()
  if (canManageLeader.value) {
    payload.groupLeaderId = form.value.groupLeaderId || null
  }
  if (canManagePermissions.value) {
    payload.permissionIds = form.value.permissionIds || []
  }
  return payload
}

const onSubmit = () => {
  if (!validate()) return
  emit('submit', getPayload())
}
</script>


<style scoped>
.group-form {
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
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.admin-only-tag {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
  background: var(--p-surface-100);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.required {
  color: var(--p-red-400);
}

.form-error {
  color: var(--p-red-400);
  font-size: 0.75rem;
}

.field-hint {
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
  font-style: italic;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.form-section h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-color);
}

.form-section h3 i {
  color: var(--p-primary-color);
}

.section-hint {
  font-size: 0.82rem;
  color: var(--p-text-muted-color);
  margin: 0 0 0.75rem 0;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>

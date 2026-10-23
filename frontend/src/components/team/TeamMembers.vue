<template>
  <div class="card-splitter">
    <h2><i class="pi pi-users"></i> Team Members</h2>
  </div>
  <div class="members-section">
    <!-- Add Member Row -->
    <div class="add-member-bar">
      <Select
        v-model="selectedAccount"
        :options="accountOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Search active account to add..."
        filter
        class="add-account-select"
      />

      <Select
        v-model="selectedRole"
        :options="roleOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Contextual role (optional)..."
        class="add-role-select"
        showClear
      />

      <Button
        label="Add Member"
        icon="pi pi-user-plus"
        :disabled="!selectedAccount"
        :loading="isAdding"
        @click="handleAddMember"
      />
    </div>

    <!-- Members Table -->
    <DataTable
      :value="members"
      stripedRows
      showGridlines
      class="members-table"
    >
      <template #empty>
        <div class="empty-state-simple">
          <p>No members currently in this team.</p>
        </div>
      </template>

      <Column field="fullName" header="Full Name">
        <template #body="{ data }"><span class="member-name">{{ data.fullName || '—' }}</span></template>
      </Column>

      <Column field="email" header="Email">
        <template #body="{ data }"><span class="member-email">{{ data.email }}</span></template>
      </Column>

      <Column header="Account Role" style="width: 150px">
        <template #body="{ data }">
          <Tag
            v-if="data.accountRole"
            :value="data.accountRole.name"
            :severity="data.accountRole.name === 'admin' || data.accountRole.name === 'Administrator' ? 'danger' : 'info'"
          />
          <span v-else class="null-text">—</span>
        </template>
      </Column>

      <Column header="Contextual Team Role" style="min-width: 200px">
        <template #body="{ data }">
          <Select
            :modelValue="data.roleId || null"
            :options="roleOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="No contextual role"
            class="table-role-select"
            @update:modelValue="newRoleId => handleRoleChange(data.id, newRoleId)"
          />
        </template>
      </Column>

      <Column header="Action" style="width: 100px; text-align: center;">
        <template #body="{ data }">
          <Button
            icon="pi pi-user-minus"
            severity="danger"
            text
            rounded
            size="small"
            v-tooltip.top="'Remove member'"
            @click="$emit('remove-member', data.id)"
          />
        </template>
      </Column>
    </DataTable>
  </div>
  <div class="card-splitter"></div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { useRole } from '@/composables/useRole'

const props = defineProps({
  members: { type: Array, default: () => [] },
  allAccounts: { type: Array, default: () => [] },
  isAdding: { type: Boolean, default: false }
})

const emit = defineEmits(['add-member', 'update-member-role', 'remove-member'])

const { roles, fetchRoles } = useRole()

const selectedAccount = ref(null)
const selectedRole = ref(null)

onMounted(async () => {
  try {
    await fetchRoles()
  } catch (err) {
    console.error('Failed to fetch roles:', err)
  }
})

const roleOptions = computed(() => {
  const options = [{ label: 'None (Inherit Global Role)', value: null }]
  if (Array.isArray(roles.value)) {
    roles.value.forEach(r => {
      options.push({ label: r.name, value: r.id })
    })
  }
  return options
})

const availableAccounts = computed(() => {
  const memberIds = new Set(props.members.map(m => m.id))
  return props.allAccounts.filter(acc => acc.isActive && !memberIds.has(acc.id))
})

const accountOptions = computed(() =>
  availableAccounts.value.map(acc => {
    const roleStr = acc.role?.name ? ` - ${acc.role.name}` : ''
    return {
      label: acc.fullName ? `${acc.fullName} (${acc.email}${roleStr})` : `${acc.email}${roleStr}`,
      value: acc.id
    }
  })
)

const handleAddMember = () => {
  if (!selectedAccount.value) return
  emit('add-member', {
    accountId: selectedAccount.value,
    roleId: selectedRole.value
  })
  selectedAccount.value = null
  selectedRole.value = null
}

const handleRoleChange = (accountId, newRoleId) => {
  emit('update-member-role', {
    accountId,
    roleId: newRoleId
  })
}
</script>

<style scoped>
.card-splitter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--p-surface-200);
  padding-bottom: 0.75rem;
  margin-bottom: 1.25rem;
}

.card-splitter h2 {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-color);
}

.card-splitter h2 i {
  color: var(--p-primary-color);
}

.members-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.add-member-bar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.add-account-select {
  flex: 2;
  min-width: 250px;
}

.add-role-select {
  flex: 1;
  min-width: 180px;
}

.table-role-select {
  width: 100%;
}

.members-table {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--p-surface-200);
}

.member-name {
  font-weight: 500;
  color: var(--p-text-color);
}

.member-email {
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.empty-state-simple {
  text-align: center;
  padding: 1.5rem;
  color: var(--p-text-muted-color);
  font-size: 0.9rem;
}

.null-text {
  color: var(--p-text-muted-color);
  font-style: italic;
}
</style>

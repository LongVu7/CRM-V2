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
        class="add-select"
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
      <Column field="role.name" header="Role" style="width: 150px">
        <template #body="{ data }">
          <Tag v-if="data.role" :value="data.role.name" :severity="data.role.name === 'admin' ? 'danger' : 'info'" />
          <span v-else class="null-text">—</span>
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
import { ref, computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Tag from 'primevue/tag'

const props = defineProps({
  members: { type: Array, default: () => [] },
  allAccounts: { type: Array, default: () => [] },
  isAdding: { type: Boolean, default: false }
})

const emit = defineEmits(['add-member', 'remove-member'])

const selectedAccount = ref(null)

const availableAccounts = computed(() => {
  const memberIds = new Set(props.members.map(m => m.id))
  return props.allAccounts.filter(acc => acc.isActive && !memberIds.has(acc.id))
})

const accountOptions = computed(() =>
  availableAccounts.value.map(acc => ({
    label: acc.fullName ? `${acc.fullName} (${acc.email})` : acc.email,
    value: acc.id
  }))
)

const handleAddMember = () => {
  if (!selectedAccount.value) return
  emit('add-member', selectedAccount.value)
  selectedAccount.value = null
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
}

.add-select {
  flex: 1;
  max-width: 400px;
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

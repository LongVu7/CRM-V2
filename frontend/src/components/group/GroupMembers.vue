
<template>
  <div class="members-section">
    <div class="section-card">
      <div class="card-header">
        <h2><i class="pi pi-users"></i> Group Members</h2>
      </div>

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
            <p>No members currently in this group.</p>
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
  </div>
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
  if (selectedAccount.value) {
    emit('add-member', selectedAccount.value)
    selectedAccount.value = null
  }
}
</script>


<style scoped>
  .members-section {
  margin-top: 1.5rem;
}

.section-card { 
  background: var(--p-content-background); 
  border: 1px solid var(--p-surface-200); 
  border-radius: 12px; 
  padding: 1.5rem; 
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); 
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--p-surface-100);
  padding-bottom: 0.75rem;
}

.card-header h2 {
  font-size: 1.15rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-color);
}

.card-header h2 i {
  color: var(--p-primary-color);
}

.add-member-bar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.add-select {
  flex: 1;
}

.members-table {
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
  overflow: hidden;
}

.member-name {
  font-weight: 600;
}

.member-email {
  color: var(--p-primary-color);
  font-size: 0.9rem;
}

.null-text {
  color: var(--p-text-muted-color);
}

.empty-state-simple {
  text-align: center;
  padding: 2rem;
  color: var(--p-text-muted-color);
  font-style: italic;
}
</style>

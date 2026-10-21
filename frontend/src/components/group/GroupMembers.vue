
<template>
  <div class="card-splitter">
    <h2><i class="pi pi-users"></i> Group Members ({{ members.length }})</h2>
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

    <!-- Members Table (Read-Only Columns) -->
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
        <template #body="{ data }">
          <div class="member-identity">
            <span class="member-name">{{ data.fullName || '—' }}</span>
            <span v-if="isLeader(data.id)" class="leader-badge-pill">
              <i class="pi pi-shield"></i> Leader
            </span>
          </div>
        </template>
      </Column>
      <Column field="email" header="Email">
        <template #body="{ data }"><span class="member-email">{{ data.email }}</span></template>
      </Column>
      <Column field="role.name" header="Role" style="width: 160px">
        <template #body="{ data }">
          <Tag v-if="data.role" :value="data.role.name" :severity="data.role.name === 'admin' ? 'danger' : 'info'" />
          <span v-else class="null-text">—</span>
        </template>
      </Column>
      <Column field="isActive" header="Status" style="width: 120px; text-align: center;">
        <template #body="{ data }">
          <Tag :value="data.isActive ? 'Active' : 'Inactive'" :severity="data.isActive ? 'success' : 'warn'" />
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
            :disabled="isLeader(data.id)"
            v-tooltip.top="isLeader(data.id) ? 'Cannot remove designated Group Leader' : 'Remove member'"
            @click="confirmRemove(data)"
          />
        </template>
      </Column>
    </DataTable>

    <ConfirmDialog group="removeMember" />
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
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'

const props = defineProps({
  members: { type: Array, default: () => [] },
  allAccounts: { type: Array, default: () => [] },
  groupLeaderId: { type: [Number, null], default: null },
  isAdding: { type: Boolean, default: false }
})

const emit = defineEmits(['add-member', 'remove-member'])

const confirm = useConfirm()
const selectedAccount = ref(null)

const isLeader = (accountId) => {
  return props.groupLeaderId && Number(props.groupLeaderId) === Number(accountId)
}

const availableAccounts = computed(() => {
  const memberIds = new Set(props.members.map(m => m.id))
  return props.allAccounts.filter(acc => acc.isActive && !memberIds.has(acc.id))
})

const accountOptions = computed(() =>
  availableAccounts.value.map(acc => {
    const roleBadge = acc.role?.name ? ` [${acc.role.name}]` : ''
    return {
      label: `Account: ${acc.fullName || 'Account #' + acc.id} | Role: ${roleBadge}`,
      value: acc.id
    }
  })
)

const handleAddMember = () => {
  if (selectedAccount.value) {
    emit('add-member', selectedAccount.value)
    selectedAccount.value = null
  }
}

const confirmRemove = (member) => {
  confirm.require({
    group: 'removeMember',
    message: `Are you sure you want to remove "${member.fullName || member.email}" from this group? Their operational permissions will be updated.`,
    header: 'Remove Member',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancel',
    rejectProps: { severity: 'secondary', text: true },
    acceptLabel: 'Remove',
    acceptProps: { severity: 'danger' },
    accept: () => {
      emit('remove-member', member.id)
    }
  })
}
</script>

<style scoped>
.members-section {
  margin-top: 1rem;
}

.card-splitter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--p-surface-100);
  padding-bottom: 0.75rem;
}

.card-splitter h2 {
  font-size: 1.15rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-color);
}

.card-splitter h2 i {
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

.member-identity {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.member-name {
  font-weight: 600;
}

.leader-badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.1rem 0.45rem;
  border-radius: 10px;
  background: var(--p-primary-50);
  color: var(--p-primary-700);
  border: 1px solid var(--p-primary-200);
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

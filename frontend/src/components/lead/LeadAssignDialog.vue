<template>
  <Dialog
    :visible="visible"
    modal
    :header="dialogTitle"
    :style="{ width: '580px', maxWidth: '95vw' }"
    class="assign-lead-dialog"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="dialog-body">
      <!-- Target Lead(s) Context Banner -->
      <div class="lead-context-box">
        <div class="context-icon">
          <i class="pi pi-ticket"></i>
        </div>
        <div class="context-content">
          <div v-if="leads.length === 1" class="single-lead-info">
            <div class="lead-name">
              <strong>{{ leadDisplayName(leads[0]) }}</strong>
              <span class="lead-phone">{{ leadDisplayPhone(leads[0]) }}</span>
            </div>
            <div class="current-assignee">
              <span class="text-muted">Current Assignee:</span>
              <Tag 
                v-if="leads[0].assignedTo" 
                :value="leads[0].assignedTo.fullName || leads[0].assignedTo.email" 
                severity="info" 
                class="ml-1"
              />
              <Tag v-else value="Unassigned" severity="warn" class="ml-1" />
            </div>
          </div>
          <div v-else class="multi-lead-info">
            <strong>Reassigning {{ leads.length }} Selected Leads</strong>
            <p class="text-muted text-xs mt-1 mb-0">
              Selected leads will be transferred to the advisor chosen below.
            </p>
          </div>
        </div>
      </div>

      <!-- Search & Filter Controls -->
      <div class="search-controls">
        <IconField class="w-full">
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="searchQuery"
            placeholder="Search advisor by name or email..."
            class="w-full"
            size="small"
          />
        </IconField>
      </div>

      <!-- Account Selection List -->
      <div class="account-selection-container">
        <div v-if="loadingAccounts" class="loading-state">
          <i class="pi pi-spin pi-spinner text-2xl text-primary"></i>
          <span>Loading advisors...</span>
        </div>

        <div v-else class="account-list">
          <!-- Unassign Option -->
          <div 
            class="account-card unassign-card"
            :class="{ active: selectedAccountId === null }"
            @click="selectedAccountId = null"
          >
            <div class="card-radio">
              <span class="custom-radio" :class="{ 'is-checked': selectedAccountId === null }">
                <span class="radio-dot"></span>
              </span>
            </div>
            <div class="card-avatar unassign-avatar">
              <i class="pi pi-user-minus"></i>
            </div>
            <div class="card-meta">
              <span class="account-name font-semibold">Unassigned (Remove Staff)</span>
              <span class="account-email text-muted text-xs">Clear the current advisor assignment</span>
            </div>
          </div>

          <!-- Staff Accounts List -->
          <div
            v-for="account in filteredAccounts"
            :key="account.id"
            class="account-card"
            :class="{ active: selectedAccountId === account.id }"
            @click="selectedAccountId = account.id"
          >
            <div class="card-radio">
              <span class="custom-radio" :class="{ 'is-checked': selectedAccountId === account.id }">
                <span class="radio-dot"></span>
              </span>
            </div>
            <div class="card-avatar">
              <i class="pi pi-user"></i>
            </div>
            <div class="card-meta">
              <div class="name-row">
                <span class="account-name font-semibold">{{ account.fullName || 'No Name' }}</span>
                <Tag 
                  :value="account.role?.name || 'Staff'" 
                  severity="info" 
                  class="role-badge" 
                />
              </div>
              <div class="details-row">
                <span class="account-email text-muted text-xs">{{ account.email }}</span>
                <Tag 
                  v-if="getTeamName(account)" 
                  :value="getTeamName(account)" 
                  severity="secondary" 
                  class="team-badge" 
                />
              </div>
            </div>
          </div>

          <!-- Empty Search State -->
          <div v-if="filteredAccounts.length === 0" class="empty-state">
            <i class="pi pi-search text-muted text-xl mb-1"></i>
            <span class="text-sm text-muted">No advisors match your search</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Dialog Footer Actions -->
    <template #footer>
      <div class="dialog-footer">
        <Button 
          label="Cancel" 
          severity="secondary" 
          text 
          @click="close" 
          :disabled="saving"
        />
        <Button 
          label="Confirm Transfer" 
          icon="pi pi-check" 
          :loading="saving"
          :disabled="selectedAccountId === undefined || leads.length === 0"
          @click="confirmAssign" 
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { searchAccounts, assignAccountToLeads } from '@/services/leadService'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  leads: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'assigned'])

const toast = useToast()

const accounts = ref([])
const loadingAccounts = ref(false)
const searchQuery = ref('')
const selectedAccountId = ref(undefined)
const saving = ref(false)

const dialogTitle = computed(() => {
  if (props.leads.length === 1) {
    return 'Transfer Lead'
  }
  return `Assign / Transfer Leads (${props.leads.length} selected)`
})

const leadDisplayName = (lead) => {
  if (!lead) return '—'
  return lead.fullName || lead.student?.fullName || `Lead #${lead.id}`
}

const leadDisplayPhone = (lead) => {
  if (!lead) return ''
  return lead.mobile || lead.student?.mobile || ''
}

const getTeamName = (account) => {
  return account.teamMemberships?.[0]?.team?.name || null
}

const filteredAccounts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return accounts.value
  return accounts.value.filter(a =>
    (a.fullName && a.fullName.toLowerCase().includes(q)) ||
    (a.email && a.email.toLowerCase().includes(q)) ||
    (a.role?.name && a.role.name.toLowerCase().includes(q)) ||
    (getTeamName(a) && getTeamName(a).toLowerCase().includes(q))
  )
})

const fetchAccounts = async () => {
  loadingAccounts.value = true
  try {
    const list = await searchAccounts()
    accounts.value = list || []
  } catch (err) {
    console.error('Failed to load accounts for assignment:', err)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load staff list',
      life: 4000
    })
  } finally {
    loadingAccounts.value = false
  }
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    searchQuery.value = ''
    if (props.leads.length === 1) {
      selectedAccountId.value = props.leads[0].assignedTo?.id ?? null
    } else {
      selectedAccountId.value = undefined
    }
    fetchAccounts()
  }
})

const close = () => {
  emit('update:visible', false)
}

const confirmAssign = async () => {
  if (props.leads.length === 0) return
  saving.value = true
  try {
    const ids = props.leads.map(l => l.id)
    await assignAccountToLeads(ids, selectedAccountId.value)

    const targetAccount = accounts.value.find(a => a.id === selectedAccountId.value)
    const targetName = targetAccount ? targetAccount.fullName || targetAccount.email : 'Unassigned'

    toast.add({
      severity: 'success',
      summary: 'Assignment Successful',
      detail: `Assigned ${ids.length} ${ids.length === 1 ? 'lead' : 'leads'} to ${targetName}`,
      life: 3000
    })

    emit('assigned', { ids, accountId: selectedAccountId.value })
    close()
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Failed to assign leads'
    toast.add({
      severity: 'error',
      summary: 'Assignment Failed',
      detail: msg,
      life: 5000
    })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.lead-context-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
}

.context-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--p-primary-100);
  color: var(--p-primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.single-lead-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.lead-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  color: var(--p-text-color);
}

.lead-phone {
  font-size: 0.82rem;
  color: var(--p-text-muted-color);
}

.current-assignee {
  display: flex;
  align-items: center;
  font-size: 0.8rem;
}

.search-controls {
  margin-top: 0.25rem;
}

.account-selection-container {
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
  overflow: hidden;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  gap: 0.5rem;
}

.account-list {
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.account-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-100);
  cursor: pointer;
  transition: background-color 0.15s ease;
  min-height: 58px;
  box-sizing: border-box;
}

.account-card:last-child {
  border-bottom: none;
}

.account-card:hover {
  background: var(--p-surface-50);
}

.account-card.active {
  background: var(--p-primary-50);
}

.card-radio {
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.custom-radio {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--p-surface-400);
  background: var(--p-content-background);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  box-sizing: border-box;
  flex-shrink: 0;
}

.account-card:hover .custom-radio {
  border-color: var(--p-primary-500);
}

.custom-radio.is-checked {
  border-color: var(--p-primary-color);
}

.radio-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--p-primary-color);
  transform: scale(0);
  transition: transform 0.15s ease;
}

.custom-radio.is-checked .radio-dot {
  transform: scale(1);
}

.card-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--p-surface-200);
  color: var(--p-surface-600);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.account-card.active .card-avatar {
  background: var(--p-primary-100);
  color: var(--p-primary-color);
}

.unassign-avatar {
  background: var(--p-orange-50) !important;
  color: var(--p-orange-500) !important;
}

.card-meta {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 0.15rem;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.account-name {
  font-size: 0.875rem;
  color: var(--p-text-color);
}

.role-badge {
  font-size: 0.7rem;
  padding: 0.1rem 0.35rem;
}

.team-badge {
  font-size: 0.7rem;
  padding: 0.1rem 0.35rem;
}

.details-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>


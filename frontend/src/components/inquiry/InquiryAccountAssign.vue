<template>
  <div v-if="$can('assign', 'inquiry')">
  <div class="section-card">
    <div class="card-header">
      <h2><i class="pi pi-briefcase"></i> Account Assignment</h2>
    </div>
    
    <div class="account-select-area">
      <Select
        v-model="selectedAccountId"
        :options="accountOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Search account by name or email..."
        filter
        showClear
        :loading="loadingAccounts"
        fluid
        @change="onAccountSelect"
      />
      <div v-if="selectedAccount" class="entity-info" style="margin-top: 0.75rem;">
        <div class="entity-avatar"><i class="pi pi-id-card"></i></div>
        <div class="entity-details">
          <h3>{{ selectedAccount.fullName }}</h3>
          <p>{{ selectedAccount.email }} | {{ selectedAccount.role?.name || 'Account' }}</p>
        </div>
        <Button 
          icon="pi pi-times" 
          severity="danger" 
          text 
          rounded 
          size="small" 
          @click="removeAccount" 
          v-tooltip.top="'Remove account'"
        />
      </div>
      <div v-else class="empty-state">
        <p>No account assigned. Inquiry will be unassigned.</p>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import Button from 'primevue/button'
import Select from 'primevue/select'
import { getAllAccounts } from '@/services/accountService'

const props = defineProps({
  initialAccount: {
    type: Object,
    default: null
  }
})

const allAccounts = ref([])
const loadingAccounts = ref(false)
const selectedAccountId = ref(null)

const accountOptions = computed(() =>
  allAccounts.value.map(acc => ({
    label: acc.fullName
      ? `${acc.fullName} (${acc.email})`
      : acc.email,
    value: acc.id
  }))
)

const selectedAccount = computed(() =>
  allAccounts.value.find(a => a.id === selectedAccountId.value) || null
)

const fetchAccounts = async () => {
  loadingAccounts.value = true
  try {
    const accounts = await getAllAccounts()
    allAccounts.value = (accounts || []).filter(a => a.isActive)
  } catch {
    allAccounts.value = []
  } finally {
    loadingAccounts.value = false
  }
}

onMounted(() => {
  fetchAccounts()
})

watch(() => props.initialAccount, (newVal) => {
  if (newVal) {
    selectedAccountId.value = newVal.id
    // Ensure the account is in the list for display
    if (!allAccounts.value.find(a => a.id === newVal.id)) {
      allAccounts.value.push(newVal)
    }
  }
}, { immediate: true })

const onAccountSelect = () => {
  // Selection handled reactively via selectedAccount computed
}

const removeAccount = () => {
  selectedAccountId.value = null
}

const getPayload = () => {
  return selectedAccountId.value || null
}

defineExpose({
  getPayload
})
</script>

<style scoped>
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

.account-select-area {
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
  padding: 1.25rem;
}

.entity-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.entity-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--p-primary-100);
  color: var(--p-primary-700);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.entity-details {
  flex: 1;
}

.entity-details h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  color: var(--p-text-color);
}

.entity-details p {
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.9rem;
}

.empty-state {
  color: var(--p-text-muted-color);
  font-style: italic;
  font-size: 0.95rem;
  margin-top: 0.75rem;
}
</style>

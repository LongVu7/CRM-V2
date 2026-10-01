<template>
  <div class="account-list-view">
    <div class="page-header">
      <div class="header-left">
        <h1><i class="pi pi-users"></i> Account Management</h1>
        <Tag :value="`${accountCount} accounts`" severity="info" rounded />
      </div>
      <div class="header-actions">
        <Button label="New Account" icon="pi pi-plus" @click="$router.push('/accounts/new')" />
      </div>
    </div>

    <AccountList />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import AccountList from '@/components/account/AccountList.vue'
import { useAccount } from '@/composables/useAccount'

const { accounts, fetchAccounts } = useAccount()

onMounted(async () => {
  try {
    await fetchAccounts()
  } catch (e) {
    // handled inside component or toast
  }
})

const accountCount = computed(() => accounts.value.length)
</script>

<style scoped>
.account-list-view { padding: 1.5rem 2rem; max-width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
.header-left { display: flex; align-items: center; gap: 0.75rem; }
.header-left h1 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--p-text-color); }
.header-left h1 i { color: var(--p-primary-color); }
.header-actions { display: flex; gap: 0.5rem; }

@media (max-width: 768px) {
  .account-list-view { padding: 1rem; }
  .page-header { flex-direction: column; align-items: flex-start; }
}
</style>

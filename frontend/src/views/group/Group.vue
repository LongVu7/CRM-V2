<template>
  <div class="group-list-view">
    <div class="page-header">
      <div class="header-left">
        <h1><i class="pi pi-folder"></i> Group Management</h1>
        <Tag :value="`${groupCount} groups`" severity="info" rounded />
      </div>
      <div class="header-actions">
        <Button label="New Group" icon="pi pi-plus" @click="$router.push('/groups/new')" />
      </div>
    </div>

    <GroupList />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import GroupList from '@/components/group/GroupList.vue'
import { useGroup } from '@/composables/useGroup'

const { groups, fetchGroups } = useGroup()

onMounted(async () => {
  try {
    await fetchGroups()
  } catch (e) {
    // handled inside component or toast
  }
})

const groupCount = computed(() => groups.value.length)
</script>

<style scoped>
.group-list-view { padding: 1.5rem 2rem; max-width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
.header-left { display: flex; align-items: center; gap: 0.75rem; }
.header-left h1 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--p-text-color); }
.header-left h1 i { color: var(--p-primary-color); }
.header-actions { display: flex; gap: 0.5rem; }

@media (max-width: 768px) {
  .group-list-view { padding: 1rem; }
  .page-header { flex-direction: column; align-items: flex-start; }
}
</style>

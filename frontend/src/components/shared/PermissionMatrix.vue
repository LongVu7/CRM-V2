<template>
  <div class="permission-matrix">
    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner"></i>
      <span>Loading permissions...</span>
    </div>
    <table v-else class="matrix-table">
      <thead>
        <tr>
          <th class="resource-header">Resource</th>
          <th v-for="action in uniqueActions" :key="action" class="action-header">
            {{ formatAction(action) }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="resource in uniqueResources" :key="resource" class="resource-row">
          <td class="resource-label">{{ formatResource(resource) }}</td>
          <td v-for="action in uniqueActions" :key="action" class="action-cell">
            <template v-if="getPermissions(resource, action).length > 0">
              <div class="perm-cell-stack">
                <div
                  v-for="perm in getPermissions(resource, action)"
                  :key="perm.id"
                  class="perm-checkbox-item"
                  :title="perm.description || perm.code"
                >
                  <Checkbox
                    :modelValue="isSelected(perm.id)"
                    :binary="true"
                    :disabled="disabled"
                    @update:modelValue="togglePermission(perm, $event)"
                  />
                  <span v-if="getScopeBadge(perm, resource, action)" class="scope-pill">
                    {{ getScopeBadge(perm, resource, action) }}
                  </span>
                </div>
              </div>
            </template>
            <span v-else class="no-permission">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import Checkbox from 'primevue/checkbox'
import { getAllPermissions } from '@/services/permissionService'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  fetchFn: { type: Function, default: null }
})

const emit = defineEmits(['update:modelValue'])

const allPermissions = ref([])
const apiActions = ref([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const data = props.fetchFn ? await props.fetchFn() : await getAllPermissions()
    allPermissions.value = Array.isArray(data) ? data : (data?.permissions || [])
    apiActions.value = data?.actions || []
  } catch {
    allPermissions.value = []
    apiActions.value = []
  } finally {
    loading.value = false
  }
})

const uniqueResources = computed(() => {
  const resources = [...new Set(allPermissions.value.map(p => p.resource))]
  return resources.sort()
})

const uniqueActions = computed(() => {
  if (apiActions.value.length > 0) return apiActions.value
  const actions = [...new Set(allPermissions.value.map(p => p.action))]
  return actions.sort()
})

const getPermissions = (resource, action) => {
  return allPermissions.value.filter(p => p.resource === resource && p.action === action)
}

const getScopeBadge = (perm, resource, action) => {
  const group = getPermissions(resource, action)
  if (group.length <= 1 && !perm.code.includes('_')) {
    return null
  }

  if (perm.code.endsWith('_all')) return 'All'
  if (perm.code.endsWith('_group')) return 'Group'
  if (perm.code.endsWith('_assigned')) return 'Assigned'
  if (perm.code.endsWith('_managed')) return 'Managed'

  // If code contains custom scope
  const parts = perm.code.split('.')
  if (parts.length > 1) {
    const actionPart = parts[1]
    const subParts = actionPart.split('_')
    if (subParts.length > 1) {
      return subParts.slice(1).join(' ')
    }
  }

  return null
}

const isSelected = (permId) => {
  return props.modelValue.includes(permId)
}

/**
 * Implements Scope Consistency Rule auto-cascades:
 * - Checking update_all or delete_all auto-checks read_all
 * - Checking update_group auto-checks read_group (if read_all not present)
 * - Checking update_assigned or delete_assigned auto-checks read_assigned (if read_all/read_group not present)
 * - Unchecking read_all auto-unchecks update_all and delete_all
 * - Unchecking read permissions cascade downwards to dependent mutations
 */
const applyScopeCascades = (currentIds, toggledPerm, checked) => {
  const ids = new Set(currentIds)
  const codeToId = new Map(allPermissions.value.map(p => [p.code, p.id]))

  if (checked) {
    ids.add(toggledPerm.id)

    // 1. Inquiry: update_all or delete_all requires read_all
    if (toggledPerm.code === 'inquiry.update_all' || toggledPerm.code === 'inquiry.delete_all') {
      const readAllId = codeToId.get('inquiry.read_all')
      if (readAllId) ids.add(readAllId)
    }

    // 2. Inquiry: update_group requires at least read_group or read_all
    if (toggledPerm.code === 'inquiry.update_group') {
      const readGroupId = codeToId.get('inquiry.read_group')
      const readAllId = codeToId.get('inquiry.read_all')
      if (!ids.has(readAllId) && readGroupId) {
        ids.add(readGroupId)
      }
    }

    // 3. Inquiry: update_assigned or delete_assigned requires a corresponding read
    if (toggledPerm.code === 'inquiry.update_assigned' || toggledPerm.code === 'inquiry.delete_assigned') {
      const readAssignedId = codeToId.get('inquiry.read_assigned')
      const readGroupId = codeToId.get('inquiry.read_group')
      const readAllId = codeToId.get('inquiry.read_all')
      if (!ids.has(readAllId) && !ids.has(readGroupId) && readAssignedId) {
        ids.add(readAssignedId)
      }
    }
  } else {
    ids.delete(toggledPerm.id)

    // If unchecking read_all:
    if (toggledPerm.code === 'inquiry.read_all') {
      const updateAllId = codeToId.get('inquiry.update_all')
      const deleteAllId = codeToId.get('inquiry.delete_all')
      if (updateAllId) ids.delete(updateAllId)
      if (deleteAllId) ids.delete(deleteAllId)

      const readGroupId = codeToId.get('inquiry.read_group')
      if (!ids.has(readGroupId)) {
        const updateGroupId = codeToId.get('inquiry.update_group')
        if (updateGroupId) ids.delete(updateGroupId)
      }

      const readAssignedId = codeToId.get('inquiry.read_assigned')
      if (!ids.has(readGroupId) && !ids.has(readAssignedId)) {
        const updateAssignedId = codeToId.get('inquiry.update_assigned')
        const deleteAssignedId = codeToId.get('inquiry.delete_assigned')
        if (updateAssignedId) ids.delete(updateAssignedId)
        if (deleteAssignedId) ids.delete(deleteAssignedId)
      }
    }

    // If unchecking read_group:
    if (toggledPerm.code === 'inquiry.read_group') {
      const readAllId = codeToId.get('inquiry.read_all')
      if (!ids.has(readAllId)) {
        const updateGroupId = codeToId.get('inquiry.update_group')
        if (updateGroupId) ids.delete(updateGroupId)

        const readAssignedId = codeToId.get('inquiry.read_assigned')
        if (!ids.has(readAssignedId)) {
          const updateAssignedId = codeToId.get('inquiry.update_assigned')
          const deleteAssignedId = codeToId.get('inquiry.delete_assigned')
          if (updateAssignedId) ids.delete(updateAssignedId)
          if (deleteAssignedId) ids.delete(deleteAssignedId)
        }
      }
    }

    // If unchecking read_assigned:
    if (toggledPerm.code === 'inquiry.read_assigned') {
      const readAllId = codeToId.get('inquiry.read_all')
      const readGroupId = codeToId.get('inquiry.read_group')
      if (!ids.has(readAllId) && !ids.has(readGroupId)) {
        const updateAssignedId = codeToId.get('inquiry.update_assigned')
        const deleteAssignedId = codeToId.get('inquiry.delete_assigned')
        if (updateAssignedId) ids.delete(updateAssignedId)
        if (deleteAssignedId) ids.delete(deleteAssignedId)
      }
    }
  }

  return [...ids]
}

const togglePermission = (perm, checked) => {
  const updated = applyScopeCascades(props.modelValue, perm, checked)
  emit('update:modelValue', updated)
}

const formatResource = (resource) => {
  return resource.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const formatAction = (action) => {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
</script>

<style scoped>
.permission-matrix {
  overflow-x: auto;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  color: var(--p-text-muted-color);
}

.matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.matrix-table th,
.matrix-table td {
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--p-surface-200);
  text-align: center;
}

.resource-header {
  text-align: left !important;
  font-weight: 700;
  background: var(--p-surface-100);
  color: var(--p-text-color);
  min-width: 150px;
}

.action-header {
  font-weight: 700;
  background: var(--p-surface-100);
  color: var(--p-text-color);
  min-width: 90px;
}

.resource-label {
  text-align: left !important;
  font-weight: 600;
  color: var(--p-text-color);
  background: var(--p-surface-50);
}

.action-cell {
  background: var(--p-content-background);
  vertical-align: middle;
}

.perm-cell-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.perm-checkbox-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
}

.scope-pill {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.05rem 0.35rem;
  border-radius: 6px;
  background: var(--p-surface-100);
  color: var(--p-text-muted-color);
  border: 1px solid var(--p-surface-200);
}

.no-permission {
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
}

.resource-row:hover .resource-label,
.resource-row:hover .action-cell {
  background: var(--p-highlight-background);
}
</style>

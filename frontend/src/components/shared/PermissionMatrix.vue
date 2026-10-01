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
            <template v-if="getPermission(resource, action)">
              <Checkbox
                :modelValue="isSelected(getPermission(resource, action).id)"
                :binary="true"
                :disabled="disabled"
                @update:modelValue="togglePermission(getPermission(resource, action).id, $event)"
              />
            </template>
            <span v-else class="no-permission">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import Checkbox from 'primevue/checkbox'
import { getAllPermissions } from '@/services/permissionService'
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const allPermissions = ref([])
const apiActions = ref([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const data = await getAllPermissions()
    allPermissions.value = data.permissions || []
    apiActions.value = data.actions || []
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
  // Fallback
  const actions = [...new Set(allPermissions.value.map(p => p.action))]
  return actions.sort()
})

const getPermission = (resource, action) => {
  return allPermissions.value.find(p => p.resource === resource && p.action === action)
}

const isSelected = (permId) => {
  return props.modelValue.includes(permId)
}

const togglePermission = (permId, checked) => {
  let updated
  if (checked) {
    updated = [...props.modelValue, permId]
  } else {
    updated = props.modelValue.filter(id => id !== permId)
  }
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
  min-width: 140px;
}

.action-header {
  font-weight: 700;
  background: var(--p-surface-100);
  color: var(--p-text-color);
  min-width: 80px;
}

.resource-label {
  text-align: left !important;
  font-weight: 600;
  color: var(--p-text-color);
  background: var(--p-surface-50);
}

.action-cell {
  background: var(--p-content-background);
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

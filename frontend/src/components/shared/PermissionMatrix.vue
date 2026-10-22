<template>
  <div class="permission-matrix">
    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner"></i>
      <span>Loading permissions matrix...</span>
    </div>
    <div v-else class="matrix-wrapper">
      <!-- Toolbar with Scope Legend & Quick Actions -->
      <div class="matrix-toolbar">
        <div class="legend-container">
          <span class="legend-title"><i class="pi pi-filter"></i> Data Scope:</span>
          <div class="legend-pills">
            <span v-if="allowAllScope" class="legend-pill-item" title="Organization-wide access">
              <span class="scope-pill pill-all">ALL</span>
              <span class="legend-text">Org-wide</span>
            </span>
            <span class="legend-pill-item" title="Limited to member's teams">
              <span class="scope-pill pill-team_only">TEAM</span>
              <span class="legend-text">Team Only</span>
            </span>
            <span class="legend-pill-item" title="Limited to assigned / owned records">
              <span class="scope-pill pill-owner_only">OWNER</span>
              <span class="legend-text">Owner Only</span>
            </span>
          </div>
        </div>

        <div v-if="!disabled" class="quick-actions">
          <Button
            label="Grant All"
            icon="pi pi-check-circle"
            size="small"
            text
            severity="success"
            @click="selectAll"
          />
          <Button
            label="Clear All"
            icon="pi pi-times-circle"
            size="small"
            text
            severity="secondary"
            @click="deselectAll"
          />
        </div>
      </div>

      <!-- Matrix Table -->
      <div class="table-container">
        <table class="matrix-table">
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
              <td class="resource-label">
                <div class="resource-title-wrapper">
                  <span class="resource-name">{{ formatResource(resource) }}</span>
                  <button
                    v-if="!disabled"
                    type="button"
                    class="row-toggle-btn"
                    title="Toggle all permissions for this resource"
                    @click="toggleRow(resource)"
                  >
                    <i :class="isRowFullySelected(resource) ? 'pi pi-check-square' : 'pi pi-minus-circle'"></i>
                  </button>
                </div>
              </td>
              <td v-for="action in uniqueActions" :key="action" class="action-cell">
                <template v-if="getPermission(resource, action)">
                  <div
                    class="perm-cell-content"
                    :class="{ 'is-selected': isSelected(getPermission(resource, action).id) }"
                  >
                    <div class="checkbox-wrapper">
                      <Checkbox
                        :modelValue="isSelected(getPermission(resource, action).id)"
                        :binary="true"
                        :disabled="disabled"
                        @update:modelValue="togglePermission(getPermission(resource, action).id, $event)"
                      />
                    </div>
                    <div v-if="isSelected(getPermission(resource, action).id)" class="scope-selector-wrapper">
                      <Select
                        :modelValue="getScope(getPermission(resource, action).id)"
                        :options="scopeOptions"
                        optionLabel="label"
                        optionValue="value"
                        :disabled="disabled"
                        class="scope-select"
                        @update:modelValue="setScope(getPermission(resource, action).id, $event)"
                      >
                        <template #value="{ value }">
                          <span :class="['scope-pill', `pill-${(value || defaultScope).toLowerCase()}`]">
                            {{ formatScopeShort(value || defaultScope) }}
                          </span>
                        </template>
                        <template #option="{ option }">
                          <div class="scope-option-row">
                            <span :class="['scope-pill', `pill-${option.value.toLowerCase()}`]">
                              {{ option.label }}
                            </span>
                            <span class="scope-option-desc">{{ option.description }}</span>
                          </div>
                        </template>
                      </Select>
                    </div>
                  </div>
                </template>
                <span v-else class="no-permission">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Checkbox from 'primevue/checkbox'
import Select from 'primevue/select'
import Button from 'primevue/button'
import { getAllPermissions } from '@/services/permissionService'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  defaultScope: { type: String, default: 'ALL' },
  allowAllScope: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue'])

const allPermissions = ref([])
const apiActions = ref([])
const loading = ref(false)

const allScopeOptions = [
  { value: 'ALL', label: 'ALL', description: 'Full access organization-wide' },
  { value: 'TEAM_ONLY', label: 'TEAM', description: 'Limited to assigned team(s)' },
  { value: 'OWNER_ONLY', label: 'OWNER', description: 'Strictly owned / assigned records' }
]

const scopeOptions = computed(() => {
  if (props.allowAllScope) {
    return allScopeOptions
  }
  return allScopeOptions.filter(o => o.value !== 'ALL')
})

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

// Normalizes modelValue array (either [1, 2] or [{ permissionId: 1, scope: 'TEAM_ONLY' }]) into a Map<id, scope>
const permissionMap = computed(() => {
  const map = new Map()
  if (!Array.isArray(props.modelValue)) return map

  for (const item of props.modelValue) {
    if (typeof item === 'number') {
      map.set(item, props.defaultScope || 'ALL')
    } else if (item && typeof item === 'object') {
      const pid = Number(item.permissionId ?? item.id)
      if (!isNaN(pid)) {
        map.set(pid, item.scope || props.defaultScope || 'ALL')
      }
    }
  }
  return map
})

const ACTION_ORDER = [
  'create',
  'read',
  'update',
  'delete',
  'export',
  'import',
  'assign',
  'assign_role',
  'assign_leader',
  'assign_perm'
]

const uniqueResources = computed(() => {
  const resources = [...new Set(allPermissions.value.map(p => p.resource))]
  return resources.sort()
})

const uniqueActions = computed(() => {
  const actions = apiActions.value.length > 0
    ? [...apiActions.value]
    : [...new Set(allPermissions.value.map(p => p.action))]

  return actions.sort((a, b) => {
    const idxA = ACTION_ORDER.indexOf(a)
    const idxB = ACTION_ORDER.indexOf(b)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.localeCompare(b)
  })
})

const getPermission = (resource, action) => {
  return allPermissions.value.find(p => p.resource === resource && p.action === action)
}

const isSelected = (permId) => {
  return permissionMap.value.has(permId)
}

const getScope = (permId) => {
  return permissionMap.value.get(permId) || props.defaultScope || 'ALL'
}

const emitUpdate = (newMap) => {
  // Only emit permissions that exist in allPermissions to avoid persisting ghost/legacy IDs
  const validIds = new Set(allPermissions.value.map(p => p.id))
  const result = []
  for (const [permissionId, scope] of newMap.entries()) {
    if (validIds.has(permissionId)) {
      result.push({ permissionId, scope })
    }
  }
  emit('update:modelValue', result)
}

const togglePermission = (permId, checked) => {
  const newMap = new Map(permissionMap.value)
  if (checked) {
    const fallbackScope = props.allowAllScope ? (props.defaultScope || 'ALL') : 'TEAM_ONLY'
    newMap.set(permId, fallbackScope)
  } else {
    newMap.delete(permId)
  }
  emitUpdate(newMap)
}

const setScope = (permId, newScope) => {
  const newMap = new Map(permissionMap.value)
  if (newMap.has(permId)) {
    newMap.set(permId, newScope)
    emitUpdate(newMap)
  }
}

const isRowFullySelected = (resource) => {
  const perms = allPermissions.value.filter(p => p.resource === resource)
  return perms.length > 0 && perms.every(p => permissionMap.value.has(p.id))
}

const toggleRow = (resource) => {
  const perms = allPermissions.value.filter(p => p.resource === resource)
  if (perms.length === 0) return

  const fullySelected = isRowFullySelected(resource)
  const newMap = new Map(permissionMap.value)
  const fallbackScope = props.allowAllScope ? (props.defaultScope || 'ALL') : 'TEAM_ONLY'

  for (const p of perms) {
    if (fullySelected) {
      newMap.delete(p.id)
    } else {
      if (!newMap.has(p.id)) {
        newMap.set(p.id, fallbackScope)
      }
    }
  }
  emitUpdate(newMap)
}

const selectAll = () => {
  const newMap = new Map(permissionMap.value)
  const fallbackScope = props.allowAllScope ? (props.defaultScope || 'ALL') : 'TEAM_ONLY'
  for (const p of allPermissions.value) {
    if (!newMap.has(p.id)) {
      newMap.set(p.id, fallbackScope)
    }
  }
  emitUpdate(newMap)
}

const deselectAll = () => {
  emit('update:modelValue', [])
}

const formatResource = (resource) => {
  return resource.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const formatAction = (action) => {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const formatScopeShort = (scope) => {
  if (!scope) return 'ALL'
  if (scope === 'TEAM_ONLY') return 'TEAM'
  if (scope === 'OWNER_ONLY') return 'OWNER'
  return scope
}
</script>

<style scoped>
.permission-matrix {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.matrix-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--p-content-background);
  border: 1px solid var(--p-surface-200);
  border-radius: 10px;
  padding: 0.75rem;
}

.matrix-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--p-surface-50);
  border-radius: 8px;
  border: 1px solid var(--p-surface-100);
}

.legend-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8rem;
}

.legend-title {
  font-weight: 700;
  color: var(--p-text-muted-color);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.legend-pills {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.legend-pill-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.legend-text {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.quick-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.table-container {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid var(--p-surface-200);
}

.matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.matrix-table th,
.matrix-table td {
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--p-surface-200);
  text-align: center;
}

.resource-header {
  text-align: left !important;
  font-weight: 700;
  background: var(--p-surface-100);
  color: var(--p-text-color);
  min-width: 160px;
}

.action-header {
  font-weight: 700;
  background: var(--p-surface-100);
  color: var(--p-text-color);
  min-width: 105px;
}

.resource-label {
  text-align: left !important;
  font-weight: 600;
  color: var(--p-text-color);
  background: var(--p-surface-50);
}

.resource-title-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.resource-name {
  font-weight: 600;
}

.row-toggle-btn {
  background: none;
  border: none;
  color: var(--p-text-muted-color);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 0.85rem;
  transition: all 0.15s ease;
}

.row-toggle-btn:hover {
  color: var(--p-primary-color);
  background: var(--p-surface-200);
}

.action-cell {
  background: var(--p-content-background);
  vertical-align: middle;
}

.perm-cell-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.25rem;
  border-radius: 6px;
  min-height: 52px;
  transition: all 0.15s ease;
}

.perm-cell-content.is-selected {
  background: rgba(14, 165, 233, 0.04);
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.scope-selector-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.scope-select.p-select) {
  height: 22px !important;
  min-width: 66px !important;
  max-width: 78px !important;
  padding: 0 4px !important;
  border: 1px solid var(--p-surface-300) !important;
  border-radius: 5px !important;
  background: var(--p-content-background) !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03) !important;
}

:deep(.scope-select .p-select-label) {
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

:deep(.scope-select .p-select-dropdown) {
  width: 14px !important;
  color: var(--p-text-muted-color) !important;
}

/* Scope Pills */
.scope-pill {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 1px 5px;
  border-radius: 4px;
  text-transform: uppercase;
  white-space: nowrap;
}

.pill-all {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.pill-team_only,
.pill-team {
  background: rgba(14, 165, 233, 0.12);
  color: #0284c7;
  border: 1px solid rgba(14, 165, 233, 0.35);
}

.pill-owner_only,
.pill-owner {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.scope-option-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 0;
}

.scope-option-desc {
  font-size: 0.72rem;
  color: var(--p-text-muted-color);
  line-height: 1.2;
}

.no-permission {
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
}

.resource-row:hover .resource-label,
.resource-row:hover .action-cell {
  background: var(--p-highlight-background);
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--p-text-muted-color);
}
</style>

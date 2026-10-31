<template>
  <Dialog
    :visible="visible"
    modal
    position="right"
    :header="`Distribute Leads to Staff (${selectedLeads.length} Leads)`"
    :style="{ width: '700px', maxWidth: '100vw', height: '100vh', maxHeight: '100vh', margin: 0 }"
    class="distribution-modal right-dock-modal"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="modal-body">
      <!-- Summary Box of Leads to Distribute -->
      <div class="distribute-summary-box">
        <div class="summary-icon">
          <i class="pi pi-share-alt"></i>
        </div>
        <div class="summary-content">
          <h4>Distribute {{ selectedLeads.length }} Unassigned Leads</h4>
          <p>
            Leads are sequentially allocated among selected staff using Round-Robin rotation.
            Drag rows or click arrows below to adjust advisor priority order.
          </p>
        </div>
      </div>

      <!-- 1. Destination Team / Staff Pool Dropdown -->
      <div class="form-group">
        <label class="form-label required">
          <i class="pi pi-users mr-1"></i> Destination Team / Staff Pool
        </label>
        <Select
          v-model="selectedTeamId"
          :options="teamOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Choose destination team or staff pool..."
          class="w-full"
          @change="onTeamChange"
        />
      </div>

      <!-- 2. Staff Multi-Select Box -->
      <div class="form-group">
        <div class="label-row">
          <label class="form-label required">
            <i class="pi pi-user mr-1"></i> Select Recipient Advisors
          </label>
          <div class="select-all-actions" v-if="staffOptions.length > 0">
            <Button
              label="Select All"
              text
              size="small"
              class="p-0 text-xs font-semibold"
              @click="selectAllStaff"
            />
            <span class="divider">|</span>
            <Button
              label="Clear"
              text
              size="small"
              severity="secondary"
              class="p-0 text-xs"
              @click="selectedStaffIds = []"
            />
          </div>
        </div>

        <MultiSelect
          v-model="selectedStaffIds"
          :options="staffOptions"
          optionLabel="label"
          optionValue="value"
          :placeholder="
            selectedTeamId
              ? 'Select advisors to receive leads...'
              : 'Please choose a team or staff pool first...'
          "
          :disabled="!selectedTeamId"
          :filter="false"
          display="chip"
          class="w-full staff-multiselect"
        >
          <template #option="{ option }">
            <div class="staff-dropdown-item">
              <span class="staff-name-bold">{{ option.fullName }}</span>
              <span class="staff-contact">({{ option.email }})</span>
              <span class="staff-role-badge">[{{ option.role }}]</span>
            </div>
          </template>
        </MultiSelect>
        <small class="helper-text" v-if="selectedTeamId">
          Selected:
          <strong>{{ selectedStaffIds.length }} / {{ staffOptions.length }}</strong> advisors ({{
            currentScopeLabel
          }})
        </small>
        <small class="helper-text text-muted" v-else>
          Choose a destination team or staff pool above to load available staff members
        </small>
      </div>

      <!-- 3. Distribution Preview with Reorderable Recipients DataTable -->
      <div class="form-group" v-if="selectedStaffIds.length > 0">
        <div class="label-row">
          <label class="form-label">
            <i class="pi pi-sort-alt mr-1"></i> Allocation Priority & Projected Results
          </label>
          <small class="text-muted text-xs">
            <i class="pi pi-info-circle mr-1"></i> Drag rows or click arrows to prioritize who
            receives leads first
          </small>
        </div>

        <div class="preview-box">
          <!-- Metric Summary Row -->
          <div class="preview-metric-row">
            <div class="metric-item">
              <span class="metric-label">Total Leads</span>
              <span class="metric-val text-primary font-bold"
                >{{ selectedLeads.length }} leads</span
              >
            </div>
            <div class="metric-item">
              <span class="metric-label">Recipients</span>
              <span class="metric-val text-primary font-bold"
                >{{ selectedStaffIds.length }} advisors</span
              >
            </div>
            <div class="metric-item">
              <span class="metric-label">Average / Staff</span>
              <span class="metric-val text-emerald font-bold"
                >~{{ averagePerStaff }} leads</span
              >
            </div>
          </div>

          <!-- Interactive Reorder DataTable -->
          <DataTable
            :value="previewAllocations"
            @rowReorder="onRowReorder"
            dataKey="staffId"
            responsiveLayout="scroll"
            size="small"
            class="reorder-allocation-table"
          >
            <Column rowReorder :reorderableColumn="false" style="width: 2.75rem" />

            <Column header="Turn" style="width: 5.5rem">
              <template #body="{ data }">
                <span class="order-badge" :class="{ 'priority-turn': data.isPriorityTurn }">
                  #{{ data.orderRank }}
                  <span
                    v-if="data.isPriorityTurn"
                    class="priority-dot"
                    title="Priority Turn: Receives extra lead"
                    >•</span
                  >
                </span>
              </template>
            </Column>

            <Column header="Recipient Advisor">
              <template #body="{ data }">
                <div class="staff-info-cell">
                  <span class="staff-name font-semibold">{{ data.fullName }}</span>
                  <span class="text-xs text-muted">
                    {{ data.email }} &bull; [{{ data.role }}]
                  </span>
                </div>
              </template>
            </Column>

            <Column header="Current Load" style="width: 7.5rem">
              <template #body="{ data }">
                <span class="text-muted text-xs font-medium">
                  {{ data.activeLeads }} leads
                </span>
              </template>
            </Column>

            <Column header="Projected" style="width: 7.5rem; text-align: right">
              <template #body="{ data }">
                <span class="alloc-badge">
                  +<strong>{{ data.count }}</strong> leads
                </span>
              </template>
            </Column>

            <Column style="width: 4rem; text-align: center">
              <template #body="{ index }">
                <div class="move-actions">
                  <Button
                    icon="pi pi-chevron-up"
                    text
                    rounded
                    size="small"
                    class="move-btn"
                    :disabled="index === 0"
                    v-tooltip.top="'Move up'"
                    @click="moveRecipient(index, -1)"
                  />
                  <Button
                    icon="pi pi-chevron-down"
                    text
                    rounded
                    size="small"
                    class="move-btn"
                    :disabled="index === previewAllocations.length - 1"
                    v-tooltip.top="'Move down'"
                    @click="moveRecipient(index, 1)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>
      </div>

      <div v-else class="empty-staff-warning">
        <template v-if="!selectedTeamId">
          <i class="pi pi-info-circle mr-2 text-blue-500"></i>
          <span
            >Please select a destination team or staff pool above to choose recipient
            advisors.</span
          >
        </template>
        <template v-else>
          <i class="pi pi-exclamation-circle mr-2 text-amber-500"></i>
          <span
            >Please select at least 1 advisor from the list above to preview and execute lead
            distribution.</span
          >
        </template>
      </div>
    </div>

    <template #footer>
      <div class="modal-footer">
        <Button label="Cancel" text severity="secondary" @click="closeModal" />
        <Button
          :label="`Confirm Distribution (${selectedLeads.length} Leads)`"
          icon="pi pi-check"
          severity="primary"
          :disabled="
            !selectedTeamId || selectedStaffIds.length === 0 || selectedLeads.length === 0
          "
          :loading="submitting"
          @click="submitDistribution"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { useToast } from 'primevue/usetoast'
import {
  getDistributionScopes,
  getRecipients,
  executeDistribution,
} from '@/services/leadDistributionService'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  selectedLeads: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:visible', 'distributed'])
const toast = useToast()

const scopes = ref([])
const staffList = ref([])
const selectedTeamId = ref(null)
const selectedStaffIds = ref([])
const submitting = ref(false)
const loadingStaff = ref(false)
let fetchToken = 0

const SCOPE_META = {
  ALL: { icon: 'pi pi-globe', label: 'All Staff' },
  NO_TEAM: { icon: 'pi pi-user', label: 'Independent Staff' },
  SELF: { icon: 'pi pi-user-edit', label: 'Myself' },
}

const teamOptions = computed(() => {
  return scopes.value.map((scope) => {
    const meta = SCOPE_META[scope.type] || { icon: 'pi pi-users', label: scope.name }
    return {
      label: `${meta.label} (${scope.memberCount || 0} members)`,
      value: scope.type === 'TEAM' ? scope.teamId : scope.type,
      scopeType: scope.type,
      teamId: scope.teamId,
      name: meta.label,
    }
  })
})

const currentScopeLabel = computed(() => {
  if (!selectedTeamId.value) return 'No team selected'
  const opt = teamOptions.value.find((o) => o.value === selectedTeamId.value)
  return opt ? opt.name : ''
})

const staffOptions = computed(() => {
  return staffList.value.map((member) => {
    const roleBadge = member.roleName ? `[${member.roleName}]` : ''
    const teamBadge = member.teamName ? `[${member.teamName}]` : ''
    const meta = [teamBadge, roleBadge].filter(Boolean).join(' ')

    return {
      label: `${member.fullName} (${member.email}) ${meta}`,
      value: member.id,
      fullName: member.fullName,
      email: member.email,
      role: member.roleName || 'Advisor',
      activeLeads: member.activeLeadsCount || 0,
    }
  })
})

const staffMap = computed(() => new Map(staffList.value.map((s) => [s.id, s])))

const selectAllStaff = () => {
  selectedStaffIds.value = staffOptions.value.map((s) => s.value)
}

const onTeamChange = async () => {
  selectedStaffIds.value = []
  staffList.value = []

  if (!selectedTeamId.value) return

  const selectedOpt = teamOptions.value.find((o) => o.value === selectedTeamId.value)
  if (!selectedOpt) return

  const currentToken = ++fetchToken
  loadingStaff.value = true
  try {
    const params =
      selectedOpt.scopeType === 'TEAM'
        ? { scope: 'TEAM', teamId: selectedOpt.teamId }
        : { scope: selectedOpt.scopeType }

    const res = await getRecipients(params)
    if (currentToken === fetchToken) {
      staffList.value = res.data || []
    }
  } catch (err) {
    if (currentToken === fetchToken) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: err.response?.data?.message || 'Failed to load staff recipients',
        life: 4000,
      })
    }
  } finally {
    if (currentToken === fetchToken) {
      loadingStaff.value = false
    }
  }
}

const averagePerStaff = computed(() => {
  const count = selectedStaffIds.value.length
  if (count === 0) return 0
  return Math.round((props.selectedLeads.length / count) * 10) / 10
})

const previewAllocations = computed(() => {
  const count = selectedStaffIds.value.length
  const total = props.selectedLeads.length
  if (count === 0 || total === 0) return []

  const baseCount = Math.floor(total / count)
  const remainder = total % count

  return selectedStaffIds.value.map((staffId, index) => {
    const staff = staffMap.value.get(staffId) || {}
    const isPriorityTurn = index < remainder
    return {
      orderRank: index + 1,
      staffId,
      fullName: staff.fullName || '',
      email: staff.email || '',
      role: staff.roleName || 'Advisor',
      activeLeads: staff.activeLeadsCount || 0,
      count: baseCount + (isPriorityTurn ? 1 : 0),
      isPriorityTurn: isPriorityTurn && remainder > 0,
    }
  })
})

const onRowReorder = (event) => {
  if (event?.value && Array.isArray(event.value)) {
    selectedStaffIds.value = event.value.map((item) => item.staffId)
  }
}

const moveRecipient = (index, delta) => {
  const targetIndex = index + delta
  if (targetIndex < 0 || targetIndex >= selectedStaffIds.value.length) return
  const ids = [...selectedStaffIds.value]
  const [moved] = ids.splice(index, 1)
  ids.splice(targetIndex, 0, moved)
  selectedStaffIds.value = ids
}

const loadScopes = async () => {
  try {
    const res = await getDistributionScopes()
    scopes.value = res.data || []
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.message || 'Failed to load distribution scopes',
      life: 4000,
    })
  }
}

watch(
  () => props.visible,
  (isOpen) => {
    if (isOpen) {
      selectedTeamId.value = null
      selectedStaffIds.value = []
      staffList.value = []
      if (scopes.value.length === 0) {
        loadScopes()
      }
    }
  },
)

const closeModal = () => {
  emit('update:visible', false)
}

const submitDistribution = async () => {
  if (selectedStaffIds.value.length === 0) {
    toast.add({
      severity: 'warn',
      summary: 'No Staff Selected',
      detail: 'Please select at least 1 staff member to receive leads',
      life: 3000,
    })
    return
  }

  const selectedOpt = teamOptions.value.find((o) => o.value === selectedTeamId.value)
  if (!selectedOpt) return

  const scopePayload =
    selectedOpt.scopeType === 'TEAM'
      ? { type: 'TEAM', teamId: selectedOpt.teamId }
      : { type: selectedOpt.scopeType }

  submitting.value = true
  try {
    const payload = {
      leadIds: props.selectedLeads.map((i) => i.id),
      staffIds: selectedStaffIds.value,
      teamId: selectedOpt.teamId || null,
      scope: scopePayload,
      method: 'ROUND_ROBIN',
    }

    const response = await executeDistribution(payload)

    if (response.skipped && response.skipped.length > 0) {
      toast.add({
        severity: 'warn',
        summary: 'Partial Distribution',
        detail: `${response.skipped.length} lead(s) were skipped (already assigned or locked).`,
        life: 5000,
      })
    }

    toast.add({
      severity: 'success',
      summary: 'Distribution Complete',
      detail: `Successfully distributed ${response.totalDistributed} leads across ${selectedStaffIds.value.length} advisors (${currentScopeLabel.value})!`,
      life: 4500,
    })

    emit('distributed')
    closeModal()
  } catch (err) {
    const status = err.response?.status || err.statusCode || 500
    const resData = err.response?.data || {}
    const reason = resData.reason || err.reason

    if (
      status === 409 ||
      reason === 'ALL_LEADS_CONFLICTED'
    ) {
      toast.add({
        severity: 'error',
        summary: 'Distribution Conflict',
        detail:
          'All requested leads were already assigned or locked by another operation. Refreshing pool...',
        life: 5000,
      })
      emit('distributed')
      closeModal()
    } else if (status === 422 || reason === 'INVALID_RECIPIENTS') {
      toast.add({
        severity: 'error',
        summary: 'Invalid Recipients',
        detail: resData.message || 'One or more recipient advisors are inactive or unauthorized',
        life: 5000,
      })
    } else {
      toast.add({
        severity: 'error',
        summary: 'Distribution Failed',
        detail: resData.message || err.message || 'An error occurred during lead distribution',
        life: 5000,
      })
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-top: 0.25rem;
}

.distribute-summary-box {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.85rem 1.15rem;
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 12px;
}

.summary-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--p-primary-100);
  color: var(--p-primary-700);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  flex-shrink: 0;
}

.summary-content h4 {
  margin: 0 0 0.2rem 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.summary-content p {
  margin: 0;
  font-size: 0.82rem;
  color: var(--p-text-muted-color);
  line-height: 1.4;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.form-label.required::after {
  content: ' *';
  color: #ef4444;
}

.select-all-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.divider {
  color: var(--p-surface-300);
  font-size: 0.75rem;
}

.staff-dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.84rem;
  width: 100%;
}

.staff-name-bold {
  font-weight: 600;
  color: var(--p-text-color);
}

.staff-contact {
  color: var(--p-text-muted-color);
  font-size: 0.78rem;
}

.staff-role-badge {
  font-size: 0.74rem;
  color: var(--p-primary-600);
  margin-left: auto;
}

.preview-box {
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 10px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preview-metric-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  border-bottom: 1px solid var(--p-surface-200);
  padding-bottom: 0.75rem;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.metric-label {
  font-size: 0.72rem;
  color: var(--p-text-muted-color);
  font-weight: 600;
  text-transform: uppercase;
}

.metric-val {
  font-size: 0.95rem;
}

.text-emerald {
  color: #059669;
}

.reorder-allocation-table {
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
  overflow: hidden;
  background: var(--p-content-background);
}

:deep(.reorder-allocation-table .p-datatable-thead > tr > th) {
  background: var(--p-surface-100);
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
  padding: 0.45rem 0.65rem;
}

:deep(.reorder-allocation-table .p-datatable-tbody > tr > td) {
  padding: 0.45rem 0.65rem;
  font-size: 0.82rem;
  vertical-align: middle;
}

.order-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  padding: 0.15rem 0.45rem;
  background: var(--p-surface-200);
  color: var(--p-text-color);
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.76rem;
}

.order-badge.priority-turn {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.priority-dot {
  color: #2563eb;
  font-size: 1rem;
  line-height: 0.5;
}

.staff-info-cell {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.staff-name {
  color: var(--p-text-color);
}

.alloc-badge {
  display: inline-block;
  background: #ecfdf5;
  color: #059669;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.78rem;
  border: 1px solid #a7f3d0;
  white-space: nowrap;
}

.move-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
}

.move-btn {
  width: 22px !important;
  height: 22px !important;
  padding: 0 !important;
}

.empty-staff-warning {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: 8px;
  font-size: 0.82rem;
  color: #92400e;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  width: 100%;
}

:deep(.right-dock-modal) {
  height: 100vh !important;
  max-height: 100vh !important;
  margin: 0 !important;
  border-radius: 16px 0 0 16px !important;
  display: flex !important;
  flex-direction: column !important;
}

:deep(.right-dock-modal .p-dialog-content) {
  flex: 1 1 auto;
  overflow-y: auto;
}

:deep(.reorder-allocation-table .p-datatable-reorderablerow-handle) {
  cursor: grab;
  color: var(--p-text-muted-color);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}

:deep(.reorder-allocation-table .p-datatable-reorderablerow-handle:hover) {
  background: var(--p-surface-200);
  color: var(--p-text-color);
}

:deep(.reorder-allocation-table .p-datatable-reorderablerow-handle:active) {
  cursor: grabbing;
}
</style>

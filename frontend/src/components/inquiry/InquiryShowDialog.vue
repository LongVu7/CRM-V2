<script setup>
import { ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import { useInquiry } from '@/composables/useInquiry'
import { formatDate, formatDateTime } from '@/utils/dateUtils'
import {
  getStatusLevel,
  formatEventNames,
  getCompensationLabel
} from '@/utils/inquiryLabels'

const props = defineProps({
  visible: { type: Boolean, default: false },
  inquiryId: { type: [Number, String], default: null }
})

defineEmits(['update:visible'])

const router = useRouter()
const { fetchInquiryById } = useInquiry()

const inquiryData = ref(null)
const loading = shallowRef(false)

watch(
  () => props.visible,
  async (isVisible) => {
    if (isVisible && props.inquiryId) {
      loading.value = true
      try {
        inquiryData.value = await fetchInquiryById(props.inquiryId)
      } catch {
        inquiryData.value = null
      } finally {
        loading.value = false
      }
    }
  }
)

const navigateToEdit = () => {
  router.push('/inquiries/' + props.inquiryId)
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    header="Inquiry Details"
    modal
    :style="{ width: '65vw' }"
    maximizable
    :contentStyle="{ padding: '0' }"
  >
    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <p>Loading inquiry data...</p>
    </div>

    <div v-else-if="!inquiryData" class="empty-state">
      <i class="pi pi-exclamation-triangle"></i>
      <h3 class="empty-title">Inquiry Not Found</h3>
    </div>

    <div v-else class="show-content">
      <!-- Status Information -->
      <div class="show-section">
        <h3 class="section-title"><i class="pi pi-chart-bar"></i> Status</h3>
        <div class="field-grid field-grid--three-col">
          <div class="field-item">
            <span class="field-label">Interaction Status</span>
            <span class="field-value">{{ getStatusLevel(inquiryData.statusData, 'interaction') }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">General Status</span>
            <span class="field-value">{{ getStatusLevel(inquiryData.statusData, 'general') }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Detail Status</span>
            <span class="field-value">{{ getStatusLevel(inquiryData.statusData, 'detail') }}</span>
          </div>
        </div>
      </div>

      <!-- Source Information -->
      <div class="show-section">
        <h3 class="section-title"><i class="pi pi-map-marker"></i> Source</h3>
        <div class="field-grid">
          <div class="field-item">
            <span class="field-label">Source</span>
            <span class="field-value">{{ inquiryData.sourceData?.name || '—' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Data Received</span>
            <span class="field-value">{{ formatDate(inquiryData.dataReceived) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Priority</span>
            <span class="field-value">{{ inquiryData.priority || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div class="show-section">
        <h3 class="section-title"><i class="pi pi-align-left"></i> Description</h3>
        <p class="description-text">{{ inquiryData.description || '—' }}</p>
      </div>

      
      <!-- Interaction Information -->
      <div class="show-section">
        <h3 class="section-title"><i class="pi pi-comments"></i> Interaction Information</h3>
        <div class="field-grid">
          <div class="field-item">
            <span class="field-label">Ngày tạo</span>
            <span class="field-value">{{ formatDate(inquiryData.createDate) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Ngày tương tác</span>
            <span class="field-value">{{ formatDate(inquiryData.interactionAt) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Số lần gọi</span>
            <span class="field-value">{{ inquiryData.callCount != null ? `${inquiryData.callCount} lần` : '—' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Tên sự kiện tham gia</span>
            <span class="field-value">{{ formatEventNames(inquiryData.eventNames) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Báo bù</span>
            <span class="field-value">{{ getCompensationLabel(inquiryData.compensationStatus) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">File ghi âm cuộc gọi</span>
            <span class="field-value field-value--muted">{{ inquiryData.recordFile || '—' }}</span>
          </div>
        </div>
        <div v-if="inquiryData.callLog" class="field-item" style="margin-top: 1rem">
          <span class="field-label">Lịch sử cuộc gọi</span>
          <p class="description-text">{{ inquiryData.callLog }}</p>
        </div>
      </div>
      <div class="show-section">
        <h3 class="section-title"><i class="pi pi-briefcase"></i> Assigned Account</h3>
        <div v-if="inquiryData.assignedTo" class="entity-info">
          <div class="entity-avatar"><i class="pi pi-id-card"></i></div>
          <div class="entity-details">
            <h4 class="entity-name">{{ inquiryData.assignedTo.fullName }}</h4>
            <p class="entity-meta">{{ inquiryData.assignedTo.email || 'No email' }}</p>
          </div>
        </div>
        <span v-else class="field-value field-value--muted">No account assigned</span>
      </div>

      <!-- Student Assignment -->
      <div v-if="$can('assign', 'inquiry')" class="show-section">
        <h3 class="section-title"><i class="pi pi-user"></i> Student Assignment</h3>
        <div v-if="inquiryData.student" class="entity-info">
          <div class="entity-avatar"><i class="pi pi-user"></i></div>
          <div class="entity-details">
            <h4 class="entity-name">{{ inquiryData.student.fullName }}</h4>
            <p class="entity-meta">{{ inquiryData.student.email || 'No email' }} | {{ inquiryData.student.mobile || 'No phone' }}</p>
          </div>
        </div>
        <span v-else class="field-value field-value--muted">No student assigned</span>
      </div>

      

      <!-- Metadata -->
      <div class="show-section show-section--metadata">
        <div class="field-grid">
          <div class="field-item">
            <span class="field-label">Created</span>
            <span class="field-value field-value--muted">{{ formatDateTime(inquiryData.createdAt) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Updated</span>
            <span class="field-value field-value--muted">{{ formatDateTime(inquiryData.updatedAt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button label="Close" severity="secondary" icon="pi pi-times" @click="$emit('update:visible', false)" />
        <Button
          v-if="$can('update', 'inquiry')"
          label="Update"
          icon="pi pi-pencil"
          @click="navigateToEdit"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 1rem;
  gap: 0.75rem;
  color: var(--p-text-muted-color);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 1rem;
  gap: 0.5rem;
  color: var(--p-text-muted-color);
}

.empty-state i {
  font-size: 3rem;
  color: var(--p-orange-400);
}

.empty-title {
  margin: 0;
  color: var(--p-text-color);
}

.show-content {
  padding: 1.5rem;
}

.show-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--p-surface-100);
}

.show-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.show-section--metadata {
  border-bottom: none;
  padding-top: 0.5rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-text-color);
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-title i {
  color: var(--p-primary-color);
  font-size: 0.9rem;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.field-grid--three-col {
  grid-template-columns: 1fr 1fr 1fr;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.field-value {
  font-size: 0.95rem;
  color: var(--p-text-color);
  word-break: break-word;
}

.field-value--muted {
  color: var(--p-text-muted-color);
}

.description-text {
  margin: 0;
  font-size: 0.95rem;
  color: var(--p-text-color);
  line-height: 1.6;
  white-space: pre-wrap;
}

.entity-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
  padding: 1rem;
}

.entity-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--p-primary-100);
  color: var(--p-primary-700);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  flex-shrink: 0;
}

.entity-details {
  flex: 1;
}

.entity-name {
  margin: 0 0 0.2rem 0;
  font-size: 1rem;
  color: var(--p-text-color);
}

.entity-meta {
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.88rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

@media (max-width: 640px) {
  .field-grid {
    grid-template-columns: 1fr;
  }

  .field-grid--three-col {
    grid-template-columns: 1fr;
  }
}
</style>

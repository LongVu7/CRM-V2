<script setup>
import { ref, onMounted, watch } from 'vue'
import Timeline from 'primevue/timeline'
import Tag from 'primevue/tag'
import { useInquiry } from '@/composables/useInquiry'
import { formatDateTime } from '@/utils/dateUtils'
import { getStatusSeverity } from '@/utils/inquiryLabels'

const props = defineProps({
  inquiryId: {
    type: [Number, String],
    required: true
  }
})

const { fetchInquiryStatusHistory } = useInquiry()

const historyItems = ref([])
const loading = ref(false)
const error = ref(null)

const loadHistory = async () => {
  if (!props.inquiryId) return
  loading.value = true
  error.value = null
  try {
    historyItems.value = await fetchInquiryStatusHistory(props.inquiryId)
  } catch (err) {
    error.value = err.message || 'Không thể tải lịch sử trạng thái'
    historyItems.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.inquiryId, () => {
  loadHistory()
})

onMounted(() => {
  loadHistory()
})
</script>

<template>
  <div class="inquiry-timeline-container">
    <div v-if="loading" class="timeline-loading">
      <i class="pi pi-spin pi-spinner text-xl text-primary"></i>
      <span class="ml-2 text-sm text-500">Đang tải lịch sử trạng thái...</span>
    </div>

    <div v-else-if="error" class="timeline-error p-3 bg-red-50 border-round text-red-700 text-sm">
      <i class="pi pi-exclamation-circle mr-2"></i>
      <span>{{ error }}</span>
    </div>

    <div v-else-if="historyItems.length === 0" class="timeline-empty p-4 text-center text-500">
      <i class="pi pi-history text-3xl mb-2 text-300"></i>
      <p class="m-0 text-sm">Chưa có lịch sử chuyển đổi trạng thái nào được ghi nhận.</p>
    </div>

    <div v-else class="timeline-content">
      <Timeline :value="historyItems" class="customized-timeline">
        <template #marker="slotProps">
          <span 
            class="timeline-marker-circle"
            :class="!slotProps.item.previousStatus ? 'marker-initial' : 'marker-transition'"
          >
            <i 
              :class="!slotProps.item.previousStatus ? 'pi pi-plus' : 'pi pi-arrow-right'"
              class="text-xs"
            ></i>
          </span>
        </template>

        <template #content="slotProps">
          <div class="timeline-event-card">
            <div class="timeline-header flex justify-content-between align-items-start mb-2">
              <div class="status-change-badges flex align-items-center gap-2 flex-wrap">
                <Tag 
                  v-if="slotProps.item.previousStatus" 
                  :value="slotProps.item.previousStatus.label || slotProps.item.previousStatus.name"
                  :severity="getStatusSeverity(slotProps.item.previousStatus)"
                  class="text-xs"
                />
                <span v-if="slotProps.item.previousStatus" class="transition-arrow text-400 font-bold">
                  →
                </span>
                <span v-else class="text-xs font-semibold text-500 uppercase mr-1">
                  Trạng thái ban đầu:
                </span>
                <Tag 
                  :value="slotProps.item.newStatus?.label || slotProps.item.newStatus?.name"
                  :severity="getStatusSeverity(slotProps.item.newStatus)"
                  class="text-xs"
                />
              </div>
              <span class="timeline-date text-xs text-500 font-medium">
                {{ formatDateTime(slotProps.item.changedAt) }}
              </span>
            </div>

            <div class="timeline-meta flex align-items-center gap-3 text-xs text-600 mb-2">
              <span v-if="slotProps.item.changedBy" class="flex align-items-center gap-1">
                <i class="pi pi-user text-xs text-400"></i>
                <strong>{{ slotProps.item.changedBy.fullName || slotProps.item.changedBy.email }}</strong>
              </span>
              <span v-else class="flex align-items-center gap-1 text-400">
                <i class="pi pi-cog text-xs"></i>
                <span>Hệ thống / Ban đầu</span>
              </span>

              <span v-if="slotProps.item.team" class="flex align-items-center gap-1 text-500">
                <i class="pi pi-users text-xs text-400"></i>
                <span>{{ slotProps.item.team.name }}</span>
              </span>
            </div>

            <div v-if="slotProps.item.notes" class="timeline-notes p-2 bg-gray-50 border-round text-xs text-700">
              <i class="pi pi-comment mr-1 text-400"></i>
              <span>{{ slotProps.item.notes }}</span>
            </div>
          </div>
        </template>
      </Timeline>
    </div>
  </div>
</template>

<style scoped>
.inquiry-timeline-container {
  padding: 0.5rem 0;
}

.timeline-loading,
.timeline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.timeline-marker-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.marker-initial {
  background-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
}

.marker-transition {
  background-color: #6366f1;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
}

.timeline-event-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.timeline-event-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.timeline-notes {
  border-left: 3px solid #6366f1;
  word-break: break-word;
}
</style>

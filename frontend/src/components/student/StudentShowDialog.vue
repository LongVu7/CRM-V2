<script setup>
import { ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { useStudent } from '@/composables/useStudent'
import { formatDate, formatDateTime } from '@/utils/dateUtils'
import {
  getClassLabel,
  getSchoolTypeLabel,
  getGpaLabel,
  getProgramScoreLabel,
  getEnglishCertLabel
} from '@/utils/studentLabels'
import { getProvinceGroupLabel } from '@/utils/regionLabels'

const props = defineProps({
  visible: { type: Boolean, default: false },
  studentId: { type: [Number, String], default: null }
})

defineEmits(['update:visible'])

const router = useRouter()
const { fetchStudentById } = useStudent()

const studentData = ref(null)
const loading = shallowRef(false)

watch(
  () => props.visible,
  async (isVisible) => {
    if (isVisible && props.studentId) {
      loading.value = true
      try {
        studentData.value = await fetchStudentById(props.studentId)
      } catch {
        studentData.value = null
      } finally {
        loading.value = false
      }
    }
  }
)

const navigateToEdit = () => {
  router.push('/students/' + props.studentId)
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    header="Student Details"
    modal
    :style="{ width: '60vw' }"
    maximizable
    :contentStyle="{ padding: '0' }"
  >
    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
      <p>Loading student data...</p>
    </div>

    <div v-else-if="!studentData" class="empty-state">
      <i class="pi pi-exclamation-triangle"></i>
      <h3 class="empty-title">Student Not Found</h3>
    </div>

    <div v-else class="show-content">
      <!-- Personal Information -->
      <div class="show-section">
        <h3 class="section-title"><i class="pi pi-user"></i> Personal Information</h3>
        <div class="field-grid">
          <div class="field-item">
            <span class="field-label">Full Name</span>
            <span class="field-value">{{ studentData.fullName || '—' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Gender</span>
            <Tag v-if="studentData.gender" :value="studentData.gender" :severity="studentData.gender === 'Male' ? 'info' : 'warn'" />
            <span v-else class="field-value field-value--muted">—</span>
          </div>
          <div class="field-item">
            <span class="field-label">Birth Date</span>
            <span class="field-value">{{ formatDate(studentData.birthDate) }}</span>
          </div>
        </div>
      </div>

      <!-- Contact Information -->
      <div class="show-section">
        <h3 class="section-title"><i class="pi pi-phone"></i> Contact Information</h3>
        <div class="field-grid">
          <div class="field-item">
            <span class="field-label">Email</span>
            <span class="field-value field-value--email">{{ studentData.email || '—' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Mobile</span>
            <span class="field-value">{{ studentData.mobile || '—' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Other Phone</span>
            <span class="field-value">{{ studentData.otherPhone || '—' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Parent Phone</span>
            <span class="field-value">{{ studentData.parentPhone || '—' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Primary Address</span>
            <span class="field-value">{{ studentData.primaryAddress || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- Education -->
      <div class="show-section">
        <h3 class="section-title"><i class="pi pi-book"></i> Education</h3>
        <div class="field-grid">
          <div class="field-item">
            <span class="field-label">School</span>
            <span class="field-value">{{ studentData.education?.school?.name || '—' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Class</span>
            <span class="field-value">{{ getClassLabel(studentData.education?.class) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">School Type</span>
            <span class="field-value">{{ getSchoolTypeLabel(studentData.education?.schoolType) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Province Group</span>
            <span class="field-value">{{ getProvinceGroupLabel(studentData.education?.provinceGroup) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Old Province</span>
            <span class="field-value">{{ studentData.education?.school?.oldProvince?.name || '—' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">New Province</span>
            <span class="field-value">{{ studentData.education?.newProvince?.name || '—' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Country</span>
            <span class="field-value">{{ studentData.education?.country?.name || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- Academic Intentions -->
      <div class="show-section">
        <h3 class="section-title"><i class="pi pi-star"></i> Academic Intentions</h3>
        <div class="field-grid">
          <div class="field-item">
            <span class="field-label">GPA</span>
            <span v-if="studentData.specializedRegister?.gpa" class="field-value field-value--gpa">{{ getGpaLabel(studentData.specializedRegister.gpa) }}</span>
            <span v-else class="field-value field-value--muted">—</span>
          </div>
          <div class="field-item">
            <span class="field-label">English Certificate</span>
            <span class="field-value">{{ getEnglishCertLabel(studentData.specializedRegister?.englishCertificate) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Interested Major</span>
            <span class="field-value">{{ studentData.specializedRegister?.interestedMajor?.label || '—' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Specific Major</span>
            <span class="field-value">{{ studentData.specializedRegister?.specificMajor?.label || '—' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Program Score</span>
            <span class="field-value">{{ getProgramScoreLabel(studentData.specializedRegister?.programScore) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Admission Year</span>
            <span class="field-value">{{ studentData.specializedRegister?.admissionYear || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- Metadata -->
      <div class="show-section show-section--metadata">
        <div class="field-grid">
          <div class="field-item">
            <span class="field-label">Created</span>
            <span class="field-value field-value--muted">{{ formatDateTime(studentData.createdAt) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Updated</span>
            <span class="field-value field-value--muted">{{ formatDateTime(studentData.updatedAt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button label="Close" severity="secondary" icon="pi pi-times" @click="$emit('update:visible', false)" />
        <Button
          v-if="$can('update', 'student')"
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

.field-value--email {
  color: var(--p-primary-color);
}

.field-value--muted {
  color: var(--p-text-muted-color);
}

.field-value--gpa {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  background: var(--p-primary-50);
  color: var(--p-primary-600);
  font-weight: 600;
  font-size: 0.85rem;
  width: fit-content;
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
}
</style>

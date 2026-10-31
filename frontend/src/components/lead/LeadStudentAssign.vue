<template>
  <div class="section-card">
    <div class="card-header">
      <h2><i class="pi pi-user"></i> Student Assignment</h2>
      <div class="header-actions">
        <template v-if="!readonly">
          <!-- When creating a new student inline -->
          <Button 
            v-if="isCreatingStudent" 
            label="Select Existing Student" 
            severity="secondary" 
            size="small" 
            icon="pi pi-search" 
            @click="isCreatingStudent = false" 
          />
          <!-- When viewing or selecting an existing student -->
          <template v-else>
            <Button 
              v-if="assignedStudent"
              label="Remove Student" 
              severity="danger" 
              text 
              size="small" 
              icon="pi pi-times" 
              @click="handleRemoveStudent" 
            />
            <Button 
              label="Create New Student" 
              severity="secondary" 
              size="small" 
              icon="pi pi-plus" 
              @click="clearSelectedStudent" 
            />
          </template>
        </template>
      </div>
    </div>
    
    <!-- 1. Inline Form to Create New Student -->
    <div v-if="isCreatingStudent && !readonly" class="student-create-area">
      <StudentForm 
        ref="studentFormRef" 
        :student="newStudentForm" 
        :hideSubmit="true"
        @update:student="newStudentForm = $event"
      />
    </div>
    
    <!-- 2. Assigned / Selected Student Area -->
    <div v-else class="selected-entity-area">
      <!-- Unified Search Student Dropdown (Same consistent style in all states) -->
      <div v-if="!readonly" class="student-select-area mb-4">
        <div class="form-field">
          <label>Search Student</label>
          <Select
            v-model="selectedStudentId"
            :options="studentOptions"
            optionLabel="label"
            optionValue="value"
            optionDisabled="disabled"
            placeholder="Search student by name, email or phone..."
            filter
            showClear
            :loading="loadingStudents"
            fluid
            @change="onStudentSelect"
          />
        </div>
      </div>

      <!-- Empty state when no student is selected -->
      <div v-if="!assignedStudent" class="empty-state">
        <p><i class="pi pi-info-circle"></i> No student assigned. Search an existing student above or click "Create New Student".</p>
      </div>

      <!-- Inline Student Details Form (displayed inline just like Inquiry Details) -->
      <div v-else class="student-inline-fields">
        <!-- Section: Personal & Contact -->
        <div class="form-grid three-col">
          <div class="form-field">
            <label>Full Name</label>
            <div class="field-value-box font-medium">{{ assignedStudent.fullName || '—' }}</div>
          </div>
          <div class="form-field">
            <label>Mobile</label>
            <div class="field-value-box">{{ assignedStudent.mobile || '—' }}</div>
          </div>
          <div class="form-field">
            <label>Email</label>
            <div class="field-value-box">{{ assignedStudent.email || '—' }}</div>
          </div>
        </div>

        <div class="form-grid three-col">
          <div class="form-field">
            <label>Gender</label>
            <div class="field-value-box">{{ assignedStudent.gender || '—' }}</div>
          </div>
          <div class="form-field">
            <label>Birth Date</label>
            <div class="field-value-box">{{ assignedStudent.birthDate ? formatDate(assignedStudent.birthDate) : '—' }}</div>
          </div>
          <div class="form-field">
            <label>Other Phone</label>
            <div class="field-value-box">{{ assignedStudent.otherPhone || '—' }}</div>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-field full-span">
            <label>Primary Address</label>
            <div class="field-value-box">{{ assignedStudent.primaryAddress || '—' }}</div>
          </div>
        </div>

        <!-- Section: Education -->
        <div class="form-grid three-col">
          <div class="form-field">
            <label>School</label>
            <div class="field-value-box font-medium text-primary">
              {{ assignedStudent.education?.school?.name || assignedStudent.education?.schoolName || '—' }}
            </div>
          </div>
          <div class="form-field">
            <label>Old Province</label>
            <div class="field-value-box font-medium">
              {{ assignedStudent.education?.oldProvince?.name || assignedStudent.education?.school?.oldProvince?.name || '—' }}
            </div>
          </div>
          <div class="form-field">
            <label>Province Group</label>
            <div class="field-value-box">
              {{ getProvinceGroupLabel(assignedStudent.education?.provinceGroup) }}
            </div>
          </div>
        </div>

        <div class="form-grid three-col">
          <div class="form-field">
            <label>Class</label>
            <div class="field-value-box">{{ getClassLabel(assignedStudent.education?.class) }}</div>
          </div>
          <div class="form-field">
            <label>School Type</label>
            <div class="field-value-box">{{ getSchoolTypeLabel(assignedStudent.education?.schoolType) }}</div>
          </div>
          <div class="form-field">
            <label>Country</label>
            <div class="field-value-box">{{ assignedStudent.education?.country?.name || '—' }}</div>
          </div>
        </div>

        <!-- Section: Academic Intentions -->
        <div class="form-grid three-col">
          <div class="form-field">
            <label>Interested Major</label>
            <div class="field-value-box font-medium text-primary">
              {{ assignedStudent.specializedRegister?.interestedMajor?.label || '—' }}
            </div>
          </div>
          <div class="form-field">
            <label>Specific Major</label>
            <div class="field-value-box font-medium">
              {{ assignedStudent.specializedRegister?.specificMajor?.label || '—' }}
            </div>
          </div>
          <div class="form-field">
            <label>GPA</label>
            <div class="field-value-box">{{ getGpaLabel(assignedStudent.specializedRegister?.gpa) }}</div>
          </div>
        </div>

        <div class="form-grid three-col">
          <div class="form-field">
            <label>English Certificate</label>
            <div class="field-value-box">{{ getEnglishCertLabel(assignedStudent.specializedRegister?.englishCertificate) }}</div>
          </div>
          <div class="form-field">
            <label>Program Score</label>
            <div class="field-value-box">{{ getProgramScoreLabel(assignedStudent.specializedRegister?.programScore) }}</div>
          </div>
          <div class="form-field">
            <label>Admission Year</label>
            <div class="field-value-box">{{ assignedStudent.specializedRegister?.admissionYear || '—' }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import Button from 'primevue/button'
import Select from 'primevue/select'
import StudentForm from '@/components/student/StudentForm.vue'
import { searchStudents } from '@/services/inquiryService'
import { useStudent } from '@/composables/useStudent'
import { formatDate } from '@/utils/dateUtils'
import {
  getClassLabel,
  getSchoolTypeLabel,
  getGpaLabel,
  getProgramScoreLabel,
  getEnglishCertLabel
} from '@/utils/studentLabels'
import { getProvinceGroupLabel } from '@/utils/regionLabels'

const props = defineProps({
  readonly: {
    type: Boolean,
    default: false
  },
  initialStudent: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['remove-student'])

const { fetchStudentById } = useStudent()

const isCreatingStudent = ref(true)
const selectedStudentId = ref(null)
const allStudents = ref([])
const loadingStudents = ref(false)
const studentFormRef = ref(null)
const fullStudentDetails = ref(null)

const newStudentForm = ref({
  fullName: '',
  gender: null,
  email: '',
  mobile: '',
  otherPhone: '',
  birthDate: null,
  primaryAddress: '',
  newSchoolCity: null,
  schoolCountry: null,
  specializedRegister: {
    interestedMajor: '',
    specificMajor: '',
    admissionYear: null,
    englishCertificate: null,
    gpa: null,
    programScore: null
  }
})

const studentOptions = computed(() =>
  allStudents.value.map(s => {
    const contactParts = [s.mobile, s.email].filter(Boolean)
    const contactStr = contactParts.length ? contactParts.join(' | ') : 'No contact'
    const isAlreadyLinked = Boolean(s.inquiry && (!props.initialStudent || props.initialStudent.id !== s.id))
    return {
      label: s.fullName
        ? `${s.fullName} (${contactStr})${isAlreadyLinked ? ' - [Already linked to inquiry]' : ''}`
        : `${contactStr}${isAlreadyLinked ? ' - [Already linked to inquiry]' : ''}`,
      value: s.id,
      disabled: isAlreadyLinked
    }
  })
)

const selectedStudent = computed(() =>
  allStudents.value.find(s => s.id === selectedStudentId.value) || null
)

const assignedStudent = computed(() => {
  return fullStudentDetails.value || selectedStudent.value || props.initialStudent || null
})

// Auto-fetch full student details whenever a student is selected or initialized
const loadFullStudent = async (studentObj) => {
  if (!studentObj?.id) {
    fullStudentDetails.value = null
    return
  }

  // If the object already has full education & specializedRegister details, use it directly
  if (studentObj.education && studentObj.specializedRegister) {
    fullStudentDetails.value = studentObj
    return
  }

  // Otherwise, fetch complete student entity via API
  try {
    const full = await fetchStudentById(studentObj.id)
    fullStudentDetails.value = full
  } catch (err) {
    console.error('Failed to fetch full student details:', err)
    fullStudentDetails.value = studentObj
  }
}

const fetchAllStudents = async () => {
  loadingStudents.value = true
  try {
    const results = await searchStudents()
    const list = Array.isArray(results) ? [...results] : []
    if (props.initialStudent && !list.some(s => s.id === props.initialStudent.id)) {
      list.unshift(props.initialStudent)
    }
    allStudents.value = list
  } catch (err) {
    console.error('Failed to load students for inquiry assignment:', err)
    allStudents.value = props.initialStudent ? [props.initialStudent] : []
  } finally {
    loadingStudents.value = false
  }
}

onMounted(() => {
  if (!props.readonly) {
    fetchAllStudents()
  }
})

watch(
  () => props.initialStudent,
  async (newStudent) => {
    if (newStudent) {
      isCreatingStudent.value = false
      selectedStudentId.value = newStudent.id
      if (!allStudents.value.some(s => s.id === newStudent.id)) {
        allStudents.value.unshift(newStudent)
      }
      await loadFullStudent(newStudent)
    } else {
      fullStudentDetails.value = null
    }
  },
  { immediate: true }
)

const onStudentSelect = async () => {
  if (selectedStudentId.value) {
    const student = allStudents.value.find(s => s.id === selectedStudentId.value)
    await loadFullStudent(student || { id: selectedStudentId.value })
  } else {
    // If user clicked the clear (X) icon in Select
    handleRemoveStudent()
  }
}

const handleRemoveStudent = () => {
  const currentId = assignedStudent.value?.id || selectedStudentId.value || props.initialStudent?.id
  if (currentId) {
    emit('remove-student', currentId)
  }
  selectedStudentId.value = null
  fullStudentDetails.value = null
  isCreatingStudent.value = false
}

const clearSelectedStudent = () => {
  if (selectedStudentId.value && props.initialStudent && selectedStudentId.value === props.initialStudent.id) {
    emit('remove-student', props.initialStudent.id)
  }
  selectedStudentId.value = null
  fullStudentDetails.value = null
  isCreatingStudent.value = true
}

const validateAndGetPayload = () => {
  if (props.readonly) return { isCreating: false, studentId: null, studentPayload: null }

  let studentPayload = null
  if (isCreatingStudent.value) {
    if (studentFormRef.value && !studentFormRef.value.validate()) {
      return { isValid: false }
    }
    studentPayload = studentFormRef.value?.getPayload() || null
  }

  return {
    isValid: true,
    isCreating: isCreatingStudent.value,
    studentPayload: isCreatingStudent.value ? studentPayload : null,
    studentId: !isCreatingStudent.value && selectedStudentId.value ? selectedStudentId.value : null
  }
}

defineExpose({
  validateAndGetPayload
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
  margin-bottom: 1.25rem;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.student-create-area {
  padding: 0.5rem 0;
}

.student-select-area {
  display: flex;
  flex-direction: column;
}

.selected-entity-area {
  display: flex;
  flex-direction: column;
}

/* Form Grid & Field matching InquiryForm exactly */
.student-inline-fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.form-grid.three-col {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.form-field.full-span {
  grid-column: span 2;
}

.form-field label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--p-text-color);
}

/* Clean, native-looking input display box */
.field-value-box {
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: var(--p-border-radius, 6px);
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  color: var(--p-text-color);
  min-height: 38px;
  display: flex;
  align-items: center;
  word-break: break-word;
  line-height: 1.4;
}

.empty-state {
  color: var(--p-text-muted-color);
  font-style: italic;
  font-size: 0.9rem;
  padding: 0.5rem 0;
}

@media (max-width: 768px) {
  .form-grid,
  .form-grid.three-col {
    grid-template-columns: 1fr;
  }

  .form-field.full-span {
    grid-column: span 1;
  }
}
</style>

<template>
  <div class="section-card">
    <div class="card-header">
      <h2><i class="pi pi-user"></i> Student Assignment</h2>
      <template v-if="!readonly">
        <Button 
          v-if="isCreatingStudent" 
          label="Select Student" 
          severity="secondary" 
          size="small" 
          icon="pi pi-search" 
          @click="isCreatingStudent = false" 
        />
        <Button 
          v-else 
          label="Create New Student" 
          severity="secondary" 
          size="small" 
          icon="pi pi-plus" 
          @click="clearSelectedStudent" 
        />
      </template>
    </div>
    
    <div v-if="isCreatingStudent && !readonly" class="student-create-area">
      <StudentForm 
        ref="studentFormRef" 
        :student="newStudentForm" 
        :hideSubmit="true"
        @update:student="newStudentForm = $event"
      />
    </div>
    
    <div v-else class="selected-entity-area">
      <div v-if="readonly && initialStudent" class="entity-info">
        <div class="entity-avatar"><i class="pi pi-user"></i></div>
        <div class="entity-details">
          <h3>{{ initialStudent.fullName }}</h3>
          <p>{{ initialStudent.email || 'No email' }} | {{ initialStudent.mobile || 'No phone' }}</p>
        </div>
        <Button 
          icon="pi pi-times" 
          severity="danger" 
          text 
          rounded 
          size="small" 
          @click="$emit('remove-student', initialStudent.id)" 
          v-tooltip.top="'Remove student'"
        />
      </div>
      <div v-else-if="!readonly" class="student-select-area">
        <Select
          v-model="selectedStudentId"
          :options="studentOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Search student by name, email or phone..."
          filter
          showClear
          :loading="loadingStudents"
          fluid
          @change="onStudentSelect"
        />
        <div v-if="selectedStudent" class="entity-info" style="margin-top: 0.75rem;">
          <div class="entity-avatar"><i class="pi pi-user"></i></div>
          <div class="entity-details">
            <h3>{{ selectedStudent.fullName }}</h3>
            <p>{{ selectedStudent.email || 'No email' }} | {{ selectedStudent.mobile || 'No phone' }}</p>
          </div>
          <Button 
            icon="pi pi-times" 
            severity="danger" 
            text 
            rounded 
            size="small" 
            @click="clearSelectedStudent" 
            v-tooltip.top="'Remove student'"
          />
        </div>
        <div v-else class="empty-state">
          <p>No student assigned.</p>
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
import { getAllStudents } from '@/services/studentService'

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

const isCreatingStudent = ref(true)
const selectedStudentId = ref(null)
const allStudents = ref([])
const loadingStudents = ref(false)
const studentFormRef = ref(null)

const newStudentForm = ref({
  fullName: '',
  gender: null,
  email: '',
  mobile: '',
  otherPhone: '',
  parentPhone: '',
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
  allStudents.value.map(s => ({
    label: s.fullName
      ? `${s.fullName} (${s.email || s.mobile || 'No contact'})`
      : s.email || s.mobile || `Student #${s.id}`,
    value: s.id
  }))
)

const selectedStudent = computed(() =>
  allStudents.value.find(s => s.id === selectedStudentId.value) || null
)

const fetchAllStudents = async () => {
  loadingStudents.value = true
  try {
    const response = await getAllStudents({ page: 1, limit: 1000 })
    allStudents.value = response.data || []
  } catch {
    allStudents.value = []
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
  () => props.initialStudent, (newStudent) => {
    if (newStudent) {
      isCreatingStudent.value = false
      selectedStudentId.value = newStudent.id
    }
  },
  { immediate: true }
)

const onStudentSelect = () => {
  // Selection handled reactively via selectedStudent computed
}

const clearSelectedStudent = () => {
  if (selectedStudentId.value && props.initialStudent && selectedStudentId.value === props.initialStudent.id) {
    emit('remove-student', props.initialStudent.id)
  }
  
  selectedStudentId.value = null
  isCreatingStudent.value = true
}

const validateAndGetPayload = () => {
  if (props.readonly) return { isCreating: false, studentId: null, studentPayload: null }

  let studentPayload = null;
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
  margin-bottom: 1.5rem;
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

.student-create-area {
  padding: 0.5rem 0;
}

.student-select-area {
  display: flex;
  flex-direction: column;
}

.selected-entity-area {
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
  padding: 1.25rem;
}

.entity-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.entity-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--p-primary-100);
  color: var(--p-primary-700);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.entity-details {
  flex: 1;
}

.entity-details h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  color: var(--p-text-color);
}

.entity-details p {
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.9rem;
}

.empty-state {
  color: var(--p-text-muted-color);
  font-style: italic;
  font-size: 0.95rem;
}
</style>

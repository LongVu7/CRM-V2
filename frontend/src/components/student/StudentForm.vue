<script setup>
import { ref, watch, onMounted } from 'vue'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'

import { useSchoolOptions } from '@/composables/useSchoolOptions'
import { useNewProvinceOptions } from '@/composables/useNewProvinceOptions'
import { useCountryOptions } from '@/composables/useCountryOptions'
import { useMajorOptions } from '@/composables/useMajorOptions'

import {
  genderOptions,
  englishCertOptions,
  gpaOptions,
  programScoreOptions,
  schoolTypeOptions,
  classOptions,
  ALLOWED_STUDENT_FIELDS,
  ALLOWED_EDUCATION_FIELDS,
  ALLOWED_SR_FIELDS
} from '@/constants/student'
import { provinceGroupOptions } from '@/constants/region'
import { isValidEmail, isValidMobile } from '@/utils/validationUtils'

const props = defineProps({
  student: { type: Object, required: true },
  isSubmitting: { type: Boolean, default: false },
  buttonText: { type: String, default: 'Submit' },
  hideSubmit: { type: Boolean, default: false }
})

const emit = defineEmits(['submit'])

// Composables
const { oldProvinces, schools, loadingOldProvinces, loadingSchools, fetchOldProvinces, fetchSchools } = useSchoolOptions()
const { newProvinces, loadingNewProvinces, fetchNewProvinces } = useNewProvinceOptions()
const { countries, loadingCountries, fetchCountries } = useCountryOptions()
const { interestedMajors, specificMajors, loadingInterested, loadingSpecific, fetchInterestedMajors, fetchSpecificMajors } = useMajorOptions()

// Component State
const form = ref({
  ...props.student,
  education: props.student.education ? { ...props.student.education } : {},
  specializedRegister: props.student.specializedRegister ? { ...props.student.specializedRegister } : {}
})

const errors = ref({})
const warnings = ref({})
const selectedOldProvinceId = ref(null)

// Watchers
watch(
  () => props.student,
  (newVal) => {
    form.value = { 
      ...newVal,
      education: newVal.education ? { ...newVal.education } : {},
      specializedRegister: newVal.specializedRegister ? { ...newVal.specializedRegister } : {}
    }
    errors.value = {}
    
    // Restore old province selection when editing an existing student with school data
    if (newVal.education?.school?.oldProvince?.id) {
      selectedOldProvinceId.value = newVal.education.school.oldProvince.id
      fetchSchools(selectedOldProvinceId.value)
    } else {
      selectedOldProvinceId.value = null
      schools.value = []
    }

    // Restore majors
    if (newVal.specializedRegister?.interestedMajorId) {
      fetchSpecificMajors(newVal.specializedRegister.interestedMajorId)
    } else {
      specificMajors.value = []
    }
  },
  { deep: true }
)

// Lifecycle
onMounted(async () => {
  fetchOldProvinces()
  fetchNewProvinces()
  fetchCountries()
  
  // If editing student with existing school, load the school's old province dropdown
  if (props.student.education?.school?.oldProvince?.id) {
    selectedOldProvinceId.value = props.student.education.school.oldProvince.id
    fetchSchools(selectedOldProvinceId.value)
  }

  // Fetch interested majors
  await fetchInterestedMajors()
  if (form.value.specializedRegister?.interestedMajorId) {
    fetchSpecificMajors(form.value.specializedRegister.interestedMajorId)
  }
})

// Methods
const onOldProvinceChange = () => {
  form.value.education.schoolId = null
  if (selectedOldProvinceId.value) {
    fetchSchools(selectedOldProvinceId.value)
  } else {
    schools.value = []
  }
}

const onInterestedMajorChange = () => {
  form.value.specializedRegister.specificMajorId = null
  specificMajors.value = []
  if (form.value.specializedRegister.interestedMajorId) {
    fetchSpecificMajors(form.value.specializedRegister.interestedMajorId)
  }
}

const validate = () => {
  const e = {}
  if (!form.value.fullName || !form.value.fullName.trim()) e.fullName = 'Full name is required'
  if (form.value.email && !isValidEmail(form.value.email)) e.email = 'Invalid email format'
  
  if (!form.value.mobile) {
    e.mobile = 'Mobile is required'
  } else if (!isValidMobile(form.value.mobile)) {
    e.mobile = 'Mobile number must be exactly 10 digits long and start with 0'
  }

  if (!form.value.gender) e.gender = 'Gender is required'

  if (!form.value.education?.newProvinceId) e.newProvince = 'New Province is required'
  if (!form.value.education?.countryId) e.country = 'Country is required'
  if (!form.value.education?.schoolType) e.schoolType = 'School Type is required'
  if (!form.value.education?.provinceGroup) e.provinceGroup = 'Province Group is required'
  if (!form.value.education?.class) e.class = 'Class is required'

  if (!form.value.specializedRegister?.gpa) e.gpa = 'GPA is required'
  if (!form.value.specializedRegister?.interestedMajorId) e.interestedMajor = 'Interested Major is required'
  if (!form.value.specializedRegister?.specificMajorId) e.specificMajor = 'Specific Major is required'
  if (!form.value.specializedRegister?.programScore) e.programScore = 'Program Score is required'

  // Required field validation
  if (!selectedOldProvinceId.value && !form.value.education?.schoolId) {
    e.schoolOldProvince = 'School old province is required'
    e.school = 'School is required'
  } else if (selectedOldProvinceId.value && !form.value.education?.schoolId) {
    e.school = 'Please select a school for the chosen old province'
  } else if (!selectedOldProvinceId.value && form.value.education?.schoolId) {
    e.schoolOldProvince = 'School old province is required when a school is selected'
  }

  errors.value = e
  warnings.value = {}
  return Object.keys(e).length === 0
}

const getPayload = () => {
  const payload = {}
  for (const key of ALLOWED_STUDENT_FIELDS) {
    const value = form.value[key]
    if (value === '' || value === null) {
      payload[key] = null
    } else if (value !== undefined) {
      payload[key] = value
    }
  }
  
  // Handle education
  if (form.value.education) {
    const eduPayload = {}
    for (const key of ALLOWED_EDUCATION_FIELDS) {
      const value = form.value.education[key]
      if (value === '' || value === null) {
        eduPayload[key] = null
      } else if (value !== undefined) {
        eduPayload[key] = value
      }
    }
    if (Object.keys(eduPayload).length > 0) {
      payload.education = eduPayload
    }
  }
  
  // Handle specializedRegister
  if (form.value.specializedRegister) {
    const srPayload = {}
    for (const key of ALLOWED_SR_FIELDS) {
      const value = form.value.specializedRegister[key]
      if (value === '' || value === null) {
        srPayload[key] = null
      } else if (value !== undefined) {
        srPayload[key] = value
      }
    }
    if (Object.keys(srPayload).length > 0) {
      payload.specializedRegister = srPayload
    }
  }
  
  return payload
}

const onSubmit = () => {
  if (!validate()) return
  emit('submit', getPayload())
}

// Ensure parent components can call these methods if a ref is used
defineExpose({
  getPayload,
  validate
})
</script>

<template>
  <form @submit.prevent="onSubmit" class="student-form">
    <div class="form-grid">
      <div class="form-field">
        <label for="sf-fullName">Full Name <span class="required">*</span></label>
        <InputText id="sf-fullName" v-model="form.fullName" placeholder="Enter full name" :invalid="!!errors.fullName" fluid />
        <small v-if="errors.fullName" class="form-error">{{ errors.fullName }}</small>
      </div>
      <div class="form-field">
        <label for="sf-gender">Gender <span class="required">*</span></label>
        <Select id="sf-gender" v-model="form.gender" :options="genderOptions" optionLabel="label" optionValue="value" placeholder="Select gender" :invalid="!!errors.gender" fluid />
        <small v-if="errors.gender" class="form-error">{{ errors.gender }}</small>
      </div>
    </div>

    <div class="form-grid">
      <div class="form-field">
        <label for="sf-email">Email</label>
        <InputText id="sf-email" v-model="form.email" placeholder="student@email.com" :invalid="!!errors.email" fluid />
        <small v-if="errors.email" class="form-error">{{ errors.email }}</small>
      </div>
      <div class="form-field">
        <label for="sf-mobile">Mobile <span class="required">*</span></label>
        <InputText id="sf-mobile" v-model="form.mobile" placeholder="Phone number" :invalid="!!errors.mobile" fluid />
        <small v-if="errors.mobile" class="form-error">{{ errors.mobile }}</small>
      </div>
    </div>

    <div class="form-grid">
      <div class="form-field">
        <label for="sf-otherPhone">Other Phone</label>
        <InputText id="sf-otherPhone" v-model="form.otherPhone" placeholder="Alternative phone" fluid />
      </div>
      <div class="form-field">
        <label for="sf-parentPhone">Parent Phone</label>
        <InputText id="sf-parentPhone" v-model="form.parentPhone" placeholder="Parent contact" fluid />
      </div>
    </div>

    <div class="form-grid">
      <div class="form-field">
        <label for="sf-birthDate">Birth Date</label>
        <DatePicker id="sf-birthDate" v-model="form.birthDate" dateFormat="dd-mm-yy" placeholder="Select date" :showIcon="true" fluid />
      </div>
      <div class="form-field">
        <label for="sf-primaryAddress">Primary address</label>
        <InputText id="sf-primaryAddress" v-model="form.primaryAddress" placeholder="Primary address" fluid />
      </div>
    </div>

    <div class="form-grid">
      <div class="form-field">
        <label for="sf-schoolOldProvince">School Old Province <span class="required">*</span></label>
        <Select id="sf-schoolOldProvince" v-model="selectedOldProvinceId" :options="oldProvinces" optionLabel="name" optionValue="id" placeholder="Select old province" :loading="loadingOldProvinces" :invalid="!!errors.schoolOldProvince" filter showClear fluid @change="onOldProvinceChange" />
        <small v-if="errors.schoolOldProvince" class="form-error">{{ errors.schoolOldProvince }}</small>
      </div>
      <div class="form-field">
        <label for="sf-school">School <span class="required">*</span></label>
        <Select id="sf-school" v-model="form.education.schoolId" :options="schools" optionLabel="name" optionValue="id" placeholder="Select school" :loading="loadingSchools" :disabled="!selectedOldProvinceId" :invalid="!!errors.school" filter showClear fluid />
        <small v-if="errors.school" class="form-error">{{ errors.school }}</small>
      </div>
    </div>
    
    <div class="form-grid">
      <div class="form-field">
        <label for="sf-newProvince">New Province <span class="required">*</span></label>
        <Select id="sf-newProvince" v-model="form.education.newProvinceId" :options="newProvinces" optionLabel="name" optionValue="id" placeholder="Select new province" :loading="loadingNewProvinces" :invalid="!!errors.newProvince" filter showClear fluid />
        <small v-if="errors.newProvince" class="form-error">{{ errors.newProvince }}</small>
      </div>
      <div class="form-field">
        <label for="sf-country">School Country <span class="required">*</span></label>
        <Select id="sf-country" v-model="form.education.countryId" :options="countries" optionLabel="name" optionValue="id" placeholder="Select country" :loading="loadingCountries" :invalid="!!errors.country" filter showClear fluid />
        <small v-if="errors.country" class="form-error">{{ errors.country }}</small>
      </div>
    </div>

    <div class="form-grid">
      <div class="form-field">
        <label for="sf-schoolType">School Type <span class="required">*</span></label>
        <Select id="sf-schoolType" v-model="form.education.schoolType" :options="schoolTypeOptions" optionLabel="label" optionValue="value" placeholder="Select school type" :invalid="!!errors.schoolType" showClear fluid />
        <small v-if="errors.schoolType" class="form-error">{{ errors.schoolType }}</small>
      </div>
      <div class="form-field">
        <label for="sf-provinceGroup">Province Group <span class="required">*</span></label>
        <Select id="sf-provinceGroup" v-model="form.education.provinceGroup" :options="provinceGroupOptions" optionLabel="label" optionValue="value" placeholder="Select province group" :invalid="!!errors.provinceGroup" showClear fluid />
        <small v-if="errors.provinceGroup" class="form-error">{{ errors.provinceGroup }}</small>
      </div>
    </div>

    <div class="form-grid">
      <div class="form-field">
        <label for="sf-class">Class <span class="required">*</span></label>
        <Select id="sf-class" v-model="form.education.class" :options="classOptions" optionLabel="label" optionValue="value" placeholder="Select class" :invalid="!!errors.class" showClear fluid />
        <small v-if="errors.class" class="form-error">{{ errors.class }}</small>
      </div>
    </div>

    <div class="section-divider">Academic Intentions</div>

    <div class="form-grid">
      <div class="form-field">
        <label for="sf-gpa">GPA <span class="required">*</span></label>
        <Select id="sf-gpa" v-model="form.specializedRegister.gpa" :options="gpaOptions" optionLabel="label" optionValue="value" placeholder="Select GPA" :invalid="!!errors.gpa" showClear fluid />
        <small v-if="errors.gpa" class="form-error">{{ errors.gpa }}</small>
      </div>
      <div class="form-field">
        <label for="sf-englishCert">English Certificate</label>
        <Select id="sf-englishCert" v-model="form.specializedRegister.englishCertificate" :options="englishCertOptions" optionLabel="label" optionValue="value" placeholder="Select certificate" showClear fluid />
      </div>
    </div>

    <div class="form-grid">
      <div class="form-field">
        <label for="sf-interestedMajor">Interested Major <span class="required">*</span></label>
        <Select id="sf-interestedMajor" v-model="form.specializedRegister.interestedMajorId"
          :options="interestedMajors" optionLabel="label" optionValue="id"
          placeholder="Select major" :loading="loadingInterested"
          :invalid="!!errors.interestedMajor" filter showClear fluid @change="onInterestedMajorChange" />
        <small v-if="errors.interestedMajor" class="form-error">{{ errors.interestedMajor }}</small>
      </div>
      <div class="form-field">
        <label for="sf-specificMajor">Specific Major <span class="required">*</span></label>
        <Select id="sf-specificMajor" v-model="form.specializedRegister.specificMajorId"
          :options="specificMajors" optionLabel="label" optionValue="id"
          placeholder="Select specific major" :loading="loadingSpecific"
          :disabled="!form.specializedRegister.interestedMajorId"
          :invalid="!!errors.specificMajor" filter showClear fluid />
        <small v-if="errors.specificMajor" class="form-error">{{ errors.specificMajor }}</small>
      </div>
    </div>

    <div class="form-grid">
      <div class="form-field">
        <label for="sf-programScore">Program Score <span class="required">*</span></label>
        <Select id="sf-programScore" v-model="form.specializedRegister.programScore" :options="programScoreOptions" optionLabel="label" optionValue="value" placeholder="Select Program Score" :invalid="!!errors.programScore" showClear fluid />
        <small v-if="errors.programScore" class="form-error">{{ errors.programScore }}</small>
      </div>
      <div class="form-field">
        <label for="sf-admissionYear">Admission Year</label>
        <InputNumber id="sf-admissionYear" v-model="form.specializedRegister.admissionYear" :useGrouping="false" :min="2000" :max="2100" placeholder="e.g. 2024" fluid />
      </div>
    </div>

    <div class="form-actions" v-if="!hideSubmit">
      <Button type="submit" :label="buttonText" icon="pi pi-check" :loading="isSubmitting" />
    </div>
  </form>
</template>

<style scoped>
.student-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.section-divider {
  margin-top: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--p-text-color);
  border-bottom: 1px solid var(--p-surface-200);
  padding-bottom: 0.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-field label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.required {
  color: var(--p-red-400);
}

.form-warning {
  color: var(--p-orange-500);
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.form-error {
  color: var(--p-red-400);
  font-size: 0.75rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>

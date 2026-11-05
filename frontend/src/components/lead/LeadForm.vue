<template>
  <div class="lead-form">
    <!-- SECTION 1: Personal & Contact Information -->
    <div class="form-section">
      <div class="section-title">
        <h3><i class="pi pi-user"></i> Personal & Contact Information</h3>
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label for="lf-fullName">Full Name <span class="required">*</span></label>
          <InputText id="lf-fullName" v-model="form.fullName" placeholder="Enter full name" :invalid="!!errors.fullName" fluid />
          <small v-if="errors.fullName" class="form-error">{{ errors.fullName }}</small>
        </div>
        <div class="form-field">
          <label for="lf-gender">Gender <span class="required">*</span></label>
          <Select id="lf-gender" v-model="form.gender" :options="genderOptions" optionLabel="label" optionValue="value" placeholder="Select gender" :invalid="!!errors.gender" fluid />
          <small v-if="errors.gender" class="form-error">{{ errors.gender }}</small>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label for="lf-mobile">Mobile <span class="required">*</span></label>
          <InputText id="lf-mobile" v-model="form.mobile" placeholder="Phone number (10 digits)" :invalid="!!errors.mobile" fluid />
          <small v-if="errors.mobile" class="form-error">{{ errors.mobile }}</small>
        </div>
        <div class="form-field">
          <label for="lf-email">Email</label>
          <InputText id="lf-email" v-model="form.email" placeholder="example@email.com" :invalid="!!errors.email" fluid />
          <small v-if="errors.email" class="form-error">{{ errors.email }}</small>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label for="lf-otherPhone">Other Phone</label>
          <InputText id="lf-otherPhone" v-model="form.otherPhone" placeholder="Alternative phone" :invalid="!!errors.otherPhone" fluid />
          <small v-if="errors.otherPhone" class="form-error">{{ errors.otherPhone }}</small>
        </div>
        <div class="form-field">
          <label for="lf-birthDate">Birth Date</label>
          <DatePicker id="lf-birthDate" v-model="form.birthDate" dateFormat="dd-mm-yy" placeholder="Select date" :showIcon="true" fluid />
        </div>
      </div>

      <div class="form-grid">
        <div class="form-field full-span">
          <label for="lf-primaryAddress">Primary Address</label>
          <InputText id="lf-primaryAddress" v-model="form.primaryAddress" placeholder="Enter address" fluid />
        </div>
      </div>
    </div>

    <!-- SECTION 2: Academic & Education -->
    <div class="form-section">
      <div class="section-title">
        <h3><i class="pi pi-book"></i> Academic & Education</h3>
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label for="lf-oldProvince">School Old Province <span class="required">*</span></label>
          <Select id="lf-oldProvince" v-model="selectedOldProvinceId" :options="oldProvinces" optionLabel="name" optionValue="id" placeholder="Select old province" :loading="loadingOldProvinces" :invalid="!!errors.schoolOldProvince" filter showClear fluid @change="onOldProvinceChange" />
          <small v-if="errors.schoolOldProvince" class="form-error">{{ errors.schoolOldProvince }}</small>
        </div>
        <div class="form-field">
          <label for="lf-school">School <span class="required">*</span></label>
          <Select id="lf-school" v-model="form.schoolId" :options="schools" optionLabel="name" optionValue="id" placeholder="Select school" :loading="loadingSchools" :disabled="!selectedOldProvinceId" :invalid="!!errors.school" filter showClear fluid />
          <small v-if="errors.school" class="form-error">{{ errors.school }}</small>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label for="lf-newProvince">New Province <span class="required">*</span></label>
          <Select id="lf-newProvince" v-model="form.newProvinceId" :options="newProvinces" optionLabel="name" optionValue="id" placeholder="Select new province" :loading="loadingOptions" :invalid="!!errors.newProvince" filter showClear fluid />
          <small v-if="errors.newProvince" class="form-error">{{ errors.newProvince }}</small>
        </div>
        <div class="form-field">
          <label for="lf-country">School Country <span class="required">*</span></label>
          <Select id="lf-country" v-model="form.countryId" :options="countries" optionLabel="name" optionValue="id" placeholder="Select country" :loading="loadingOptions" :invalid="!!errors.country" filter showClear fluid />
          <small v-if="errors.country" class="form-error">{{ errors.country }}</small>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label for="lf-schoolType">School Type <span class="required">*</span></label>
          <Select id="lf-schoolType" v-model="form.schoolType" :options="schoolTypeOptions" optionLabel="label" optionValue="value" placeholder="Select school type" :invalid="!!errors.schoolType" showClear fluid />
          <small v-if="errors.schoolType" class="form-error">{{ errors.schoolType }}</small>
        </div>
        <div class="form-field">
          <label for="lf-provinceGroup">Province Group <span class="required">*</span></label>
          <Select id="lf-provinceGroup" v-model="form.provinceGroup" :options="provinceGroupOptions" optionLabel="label" optionValue="value" placeholder="Select province group" :invalid="!!errors.provinceGroup" showClear fluid />
          <small v-if="errors.provinceGroup" class="form-error">{{ errors.provinceGroup }}</small>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label for="lf-class">Class <span class="required">*</span></label>
          <Select id="lf-class" v-model="form.class" :options="classOptions" optionLabel="label" optionValue="value" placeholder="Select class" :invalid="!!errors.class" showClear fluid />
          <small v-if="errors.class" class="form-error">{{ errors.class }}</small>
        </div>
      </div>

      <div class="subsection-divider">Academic Intentions</div>

      <div class="form-grid">
        <div class="form-field">
          <label for="lf-gpa">GPA <span class="required">*</span></label>
          <Select id="lf-gpa" v-model="form.gpa" :options="gpaOptions" optionLabel="label" optionValue="value" placeholder="Select GPA" :invalid="!!errors.gpa" showClear fluid />
          <small v-if="errors.gpa" class="form-error">{{ errors.gpa }}</small>
        </div>
        <div class="form-field">
          <label for="lf-englishCert">English Certificate</label>
          <Select id="lf-englishCert" v-model="form.englishCertificate" :options="englishCertOptions" optionLabel="label" optionValue="value" placeholder="Select certificate" showClear fluid />
        </div>
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label for="lf-interestedMajor">Interested Major <span class="required">*</span></label>
          <Select id="lf-interestedMajor" v-model="form.interestedMajorId" :options="interestedMajors" optionLabel="label" optionValue="id" placeholder="Select major" :loading="loadingOptions" :invalid="!!errors.interestedMajor" filter showClear fluid @change="onInterestedMajorChange" />
          <small v-if="errors.interestedMajor" class="form-error">{{ errors.interestedMajor }}</small>
        </div>
        <div class="form-field">
          <label for="lf-specificMajor">Specific Major <span class="required">*</span></label>
          <Select id="lf-specificMajor" v-model="form.specificMajorId" :options="specificMajors" optionLabel="label" optionValue="id" placeholder="Select specific major" :loading="loadingSpecific" :disabled="!form.interestedMajorId" :invalid="!!errors.specificMajor" filter showClear fluid />
          <small v-if="errors.specificMajor" class="form-error">{{ errors.specificMajor }}</small>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label for="lf-programScore">Program Score <span class="required">*</span></label>
          <Select id="lf-programScore" v-model="form.programScore" :options="programScoreOptions" optionLabel="label" optionValue="value" placeholder="Select score" :invalid="!!errors.programScore" showClear fluid />
          <small v-if="errors.programScore" class="form-error">{{ errors.programScore }}</small>
        </div>
        <div class="form-field">
          <label for="lf-admissionYear">Admission Year</label>
          <InputNumber id="lf-admissionYear" v-model="form.admissionYear" placeholder="e.g. 2026" :useGrouping="false" fluid />
        </div>
      </div>
    </div>

    <!-- SECTION 3: Lead Source & Pipeline Status -->
    <div class="form-section">
      <div class="section-title">
        <h3><i class="pi pi-sliders-h"></i> Source & Pipeline Status</h3>
      </div>

      <!-- Status Cascading -->
      <div class="form-grid three-col" v-if="!isCollaborator">
        <div class="form-field">
          <label>Status Interaction</label>
          <Select v-model="selectedInteraction" :options="interactions" optionLabel="label" optionValue="id" placeholder="Select interaction" :loading="loadingInteractions" fluid showClear />
        </div>
        <div class="form-field">
          <label>Status General</label>
          <Select v-model="selectedGeneral" :options="generals" optionLabel="label" optionValue="id" placeholder="Select general" :loading="loadingGenerals" :disabled="!selectedInteraction" fluid showClear />
        </div>
        <div class="form-field">
          <label>Status Detail</label>
          <Select v-model="selectedDetail" :options="details" optionLabel="label" optionValue="id" placeholder="Select detail" :loading="loadingStatusDetails" :disabled="!selectedGeneral || details.length === 0" fluid showClear />
        </div>
      </div>

      <!-- Source Cascading -->
      <div class="form-grid three-col">
        <div class="form-field">
          <label>Source</label>
          <Select v-model="selectedSource" :options="sources" optionLabel="label" optionValue="id" placeholder="Select source" :loading="loadingSources" fluid showClear />
        </div>
        <div class="form-field">
          <label>Source Detail</label>
          <Select v-model="selectedSourceDetail" :options="sourceDetails" optionLabel="label" optionValue="id" placeholder="Select detail" :loading="loadingSourceDetails" :disabled="!selectedSource" fluid showClear />
        </div>
        <div class="form-field">
          <label>Approach Method</label>
          <Select v-model="selectedApproachMethod" :options="approachMethods" optionLabel="label" optionValue="id" placeholder="Select method" :loading="loadingMethods" :disabled="!selectedSourceDetail" fluid showClear />
        </div>
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label>Data Received</label>
          <DatePicker v-model="form.dataReceived" dateFormat="dd-mm-yy" placeholder="Select date" :showIcon="true" fluid />
        </div>
        <div class="form-field">
          <label>Priority</label>
          <Select v-model="form.priority" :options="priorityOptions" optionLabel="label" optionValue="value" placeholder="Select priority" showClear fluid />
        </div>
      </div>

      <div class="form-grid">
        <div class="form-field full-span">
          <label>Description</label>
          <Textarea v-model="form.description" rows="3" placeholder="Enter lead description..." fluid />
        </div>
      </div>
    </div>

    <!-- SECTION 4: Interaction Details -->
    <div class="form-section" v-if="!isCollaborator">
      <div class="section-title">
        <h3><i class="pi pi-comments"></i> Interaction Information</h3>
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label>Create Date</label>
          <DatePicker v-model="form.createDate" dateFormat="dd-mm-yy" placeholder="Select date" :showIcon="true" fluid />
        </div>
        <div class="form-field">
          <label>Interaction Date</label>
          <DatePicker v-model="form.interactionAt" dateFormat="dd-mm-yy" placeholder="Select date" :showIcon="true" fluid />
        </div>
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label>Call Count</label>
          <Select v-model="form.callCount" :options="callCountOptions" optionLabel="label" optionValue="value" placeholder="Select count" showClear fluid />
        </div>
        <div class="form-field">
          <label>Compensation Status</label>
          <Select v-model="form.compensationStatus" :options="compensationOptions" optionLabel="label" optionValue="value" placeholder="Select status" showClear fluid />
        </div>
      </div>

      <div class="form-grid">
        <div class="form-field full-span">
          <label>Event Names</label>
          <MultiSelect v-model="form.eventNames" :options="eventOptions" optionLabel="label" optionValue="value" placeholder="Select events" filter display="chip" fluid />
        </div>
      </div>

      <div class="form-grid">
        <div class="form-field full-span">
          <label>Call Log</label>
          <Textarea v-model="form.callLog" rows="3" placeholder="Enter call notes/history..." fluid />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, watch, onMounted, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import MultiSelect from 'primevue/multiselect'

import { useSchoolOptions } from '@/composables/useSchoolOptions'
import { useStudentOptions } from '@/composables/useStudentOptions'
import { useSourceData } from '@/composables/useSourceData'
import { useStatusData } from '@/composables/useStatusData'

import {
  genderOptions,
  englishCertOptions,
  gpaOptions,
  programScoreOptions,
  schoolTypeOptions,
  classOptions
} from '@/constants/student'
import { provinceGroupOptions } from '@/constants/region'
import { eventOptions, compensationOptions, priorityOptions } from '@/constants/lead'
import { isValidEmail, isValidMobile } from '@/utils/validationUtils'

const callCountOptions = Array.from({ length: 10 }, (_, i) => ({
  label: `${i + 1} lần`,
  value: i + 1
}))

const props = defineProps({
  initialLead: {
    type: Object,
    default: null
  },
  hideStatusAndInteraction: {
    type: Boolean,
    default: false
  }
})

const authStore = useAuthStore()
const isCollaborator = computed(() => {
  if (props.hideStatusAndInteraction) return true
  const role = (authStore.user?.roleName || authStore.user?.role?.name || '').toLowerCase()
  return role === 'collaborator' || role === 'ctv'
})

// Options
const { oldProvinces, schools, loadingOldProvinces, loadingSchools, fetchOldProvinces, fetchSchools } = useSchoolOptions()
const {
  newProvinces,
  countries,
  interestedMajors,
  specificMajors,
  loadingOptions,
  loadingSpecific,
  fetchStudentOptions,
  fetchSpecificMajors
} = useStudentOptions()

const {
  sources, sourceDetails, approachMethods,
  loadingSources, loadingSourceDetails, loadingMethods,
  fetchSources, fetchSourceDetails, fetchApproachMethods,
  findSourceNode
} = useSourceData()

const {
  interactions, generals, details,
  loadingInteractions, loadingGenerals, loadingStatusDetails,
  fetchInteractions, fetchGenerals, fetchDetails,
  findStatusNode
} = useStatusData()

// State
const selectedOldProvinceId = ref(null)
const selectedSource = shallowRef(null)
const selectedSourceDetail = shallowRef(null)
const selectedApproachMethod = shallowRef(null)
const selectedInteraction = shallowRef(null)
const selectedGeneral = shallowRef(null)
const selectedDetail = shallowRef(null)

const isRestoringSource = ref(false)
const isRestoringStatus = ref(false)

const errors = ref({})

const initForm = () => ({
  fullName: '',
  gender: null,
  mobile: '',
  email: '',
  otherPhone: '',
  birthDate: null,
  primaryAddress: '',

  oldProvinceId: null,
  schoolId: null,
  newProvinceId: null,
  countryId: null,
  provinceGroup: null,
  schoolType: null,
  class: null,

  interestedMajorId: null,
  specificMajorId: null,
  gpa: null,
  englishCertificate: null,
  programScore: null,
  admissionYear: null,

  sourceDataId: null,
  statusDataId: null,
  dataReceived: null,
  description: '',
  priority: null,
  createDate: null,
  interactionAt: null,
  callCount: null,
  compensationStatus: null,
  eventNames: [],
  callLog: ''
})

const form = ref(initForm())

const toDate = (val) => {
  if (!val) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

const onOldProvinceChange = () => {
  form.value.oldProvinceId = selectedOldProvinceId.value || null
  form.value.schoolId = null
  if (selectedOldProvinceId.value) {
    fetchSchools(selectedOldProvinceId.value)
  } else {
    schools.value = []
  }
}

const onInterestedMajorChange = () => {
  form.value.specificMajorId = null
  specificMajors.value = []
  if (form.value.interestedMajorId) {
    fetchSpecificMajors(form.value.interestedMajorId)
  }
}

// Source Cascading
const computeSourceId = () => {
  form.value.sourceDataId = selectedApproachMethod.value || selectedSourceDetail.value || selectedSource.value || null
}

watch(selectedSource, async (newVal) => {
  if (isRestoringSource.value) return
  selectedSourceDetail.value = null
  selectedApproachMethod.value = null
  if (newVal) await fetchSourceDetails(newVal)
  computeSourceId()
})

watch(selectedSourceDetail, async (newVal) => {
  if (isRestoringSource.value) return
  selectedApproachMethod.value = null
  if (newVal) await fetchApproachMethods(newVal)
  computeSourceId()
})

watch(selectedApproachMethod, () => {
  if (isRestoringSource.value) return
  computeSourceId()
})

const restoreSourceHierarchy = async (targetId) => {
  if (!targetId) return
  isRestoringSource.value = true
  try {
    if (!sources.value.length) {
      await fetchSources()
    }
    const res = findSourceNode(targetId)
    if (!res) return
    selectedSource.value = res.sourceId
    if (res.detailId) {
      await fetchSourceDetails(res.sourceId)
      selectedSourceDetail.value = res.detailId
    }
    if (res.methodId) {
      await fetchApproachMethods(res.detailId)
      selectedApproachMethod.value = res.methodId
    }
  } finally {
    await nextTick()
    isRestoringSource.value = false
  }
}

// Status Cascading
const computeStatusId = () => {
  form.value.statusDataId = selectedDetail.value || selectedGeneral.value || selectedInteraction.value || null
}

watch(selectedInteraction, async (newVal) => {
  if (isRestoringStatus.value) return
  selectedGeneral.value = null
  selectedDetail.value = null
  if (newVal) await fetchGenerals(newVal)
  computeStatusId()
})

watch(selectedGeneral, async (newVal) => {
  if (isRestoringStatus.value) return
  selectedDetail.value = null
  if (newVal) await fetchDetails(newVal)
  computeStatusId()
})

watch(selectedDetail, () => {
  if (isRestoringStatus.value) return
  computeStatusId()
})

const restoreStatusHierarchy = async (targetId) => {
  if (!targetId) return
  isRestoringStatus.value = true
  try {
    if (!interactions.value.length) {
      await fetchInteractions()
    }
    const res = findStatusNode(targetId)
    if (!res) return
    selectedInteraction.value = res.interactionId
    if (res.generalId) {
      await fetchGenerals(res.interactionId)
      selectedGeneral.value = res.generalId
    }
    if (res.detailId) {
      await fetchDetails(res.generalId)
      selectedDetail.value = res.detailId
    }
  } finally {
    await nextTick()
    isRestoringStatus.value = false
  }
}

const populateFromLead = (lead) => {
  if (!lead) {
    form.value = initForm()
    selectedOldProvinceId.value = null
    return
  }

  form.value = {
    fullName: lead.fullName || lead.student?.fullName || '',
    gender: lead.gender || lead.student?.gender || null,
    mobile: lead.mobile || lead.student?.mobile || '',
    email: lead.email ?? lead.student?.email ?? '',
    otherPhone: lead.otherPhone ?? lead.student?.otherPhone ?? '',
    birthDate: toDate(lead.birthDate || lead.student?.birthDate),
    primaryAddress: lead.primaryAddress ?? lead.student?.primaryAddress ?? '',

    oldProvinceId: lead.oldProvinceId || lead.student?.education?.oldProvinceId || lead.student?.education?.school?.oldProvince?.id || null,
    schoolId: lead.schoolId || lead.student?.education?.schoolId || null,
    newProvinceId: lead.newProvinceId || lead.student?.education?.newProvinceId || null,
    countryId: lead.countryId || lead.student?.education?.countryId || null,
    provinceGroup: lead.provinceGroup || lead.student?.education?.provinceGroup || null,
    schoolType: lead.schoolType || lead.student?.education?.schoolType || null,
    class: lead.class || lead.student?.education?.class || null,

    interestedMajorId: lead.interestedMajorId || lead.student?.specializedRegister?.interestedMajorId || null,
    specificMajorId: lead.specificMajorId || lead.student?.specializedRegister?.specificMajorId || null,
    gpa: lead.gpa || lead.student?.specializedRegister?.gpa || null,
    englishCertificate: lead.englishCertificate || lead.student?.specializedRegister?.englishCertificate || null,
    programScore: lead.programScore || lead.student?.specializedRegister?.programScore || null,
    admissionYear: lead.admissionYear || lead.student?.specializedRegister?.admissionYear || null,

    sourceDataId: lead.sourceDataId || null,
    statusDataId: lead.statusDataId || null,
    dataReceived: toDate(lead.dataReceived),
    description: lead.description || '',
    priority: lead.priority || null,
    createDate: toDate(lead.createDate),
    interactionAt: toDate(lead.interactionAt),
    callCount: lead.callCount || null,
    compensationStatus: lead.compensationStatus || null,
    eventNames: Array.isArray(lead.eventNames) ? [...lead.eventNames] : [],
    callLog: lead.callLog || ''
  }

  const oldProvId = form.value.oldProvinceId
  if (oldProvId) {
    selectedOldProvinceId.value = oldProvId
    fetchSchools(oldProvId)
  }

  if (form.value.interestedMajorId) {
    fetchSpecificMajors(form.value.interestedMajorId)
  }

  if (lead.sourceDataId) {
    restoreSourceHierarchy(lead.sourceDataId)
  }
  if (lead.statusDataId && !isCollaborator.value) {
    restoreStatusHierarchy(lead.statusDataId)
  }
}

watch(
  () => props.initialLead,
  (newLead) => {
    if (newLead) populateFromLead(newLead)
  },
  { immediate: true }
)

// Validation
const validate = () => {
  const e = {}
  const f = form.value

  if (!f.fullName || !f.fullName.trim()) e.fullName = 'Full name is required'
  if (!f.gender) e.gender = 'Gender is required'
  if (!f.mobile) {
    e.mobile = 'Mobile is required'
  } else if (!isValidMobile(f.mobile)) {
    e.mobile = 'Mobile number must be exactly 10 digits and start with 0'
  }
  if (f.email && !isValidEmail(f.email)) e.email = 'Invalid email format'
  const trimmedOther = f.otherPhone ? String(f.otherPhone).trim() : ''
  if (trimmedOther && !isValidMobile(trimmedOther)) {
    e.otherPhone = 'Other phone number must be exactly 10 digits and start with 0'
  }

  if (!selectedOldProvinceId.value && !f.schoolId) {
    e.schoolOldProvince = 'School old province is required'
    e.school = 'School is required'
  } else if (selectedOldProvinceId.value && !f.schoolId) {
    e.school = 'Please select a school'
  }

  if (!f.newProvinceId) e.newProvince = 'New Province is required'
  if (!f.countryId) e.country = 'Country is required'
  if (!f.schoolType) e.schoolType = 'School Type is required'
  if (!f.provinceGroup) e.provinceGroup = 'Province Group is required'
  if (!f.class) e.class = 'Class is required'

  if (!f.gpa) e.gpa = 'GPA is required'
  if (!f.interestedMajorId) e.interestedMajor = 'Interested Major is required'
  if (!f.specificMajorId) e.specificMajor = 'Specific Major is required'
  if (!f.programScore) e.programScore = 'Program Score is required'

  errors.value = e
  return Object.keys(e).length === 0
}

// Return clean flat Lead payload
const getPayload = () => {
  const f = form.value
  const payload = {}

  for (const [key, val] of Object.entries(f)) {
    if (val === '' || val === null) {
      payload[key] = null
    } else if (val instanceof Date) {
      payload[key] = val.toISOString()
    } else if (val !== undefined) {
      payload[key] = (key === 'mobile' || key === 'otherPhone') && typeof val === 'string' ? val.trim() : val
    }
  }

  if (isCollaborator.value) {
    delete payload.statusDataId
    delete payload.createDate
    delete payload.interactionAt
    delete payload.callCount
    delete payload.compensationStatus
    delete payload.eventNames
    delete payload.callLog
  }

  return payload
}

onMounted(async () => {
  fetchOldProvinces()
  await fetchStudentOptions()
  if (!isCollaborator.value) {
    await Promise.all([fetchSources(), fetchInteractions()])
  } else {
    await fetchSources()
  }

  if (props.initialLead) {
    populateFromLead(props.initialLead)
  }
})

defineExpose({
  validate,
  getPayload,
  getFirstError: () => Object.values(errors.value)[0] || null,
  errors
})
</script>

<style scoped>
.lead-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.section-title {
  border-bottom: 1px solid var(--p-surface-200);
  padding-bottom: 0.5rem;
}

.section-title h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-color);
}

.section-title h3 i {
  color: var(--p-primary-color);
}

.subsection-divider {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--p-text-muted-color);
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--p-surface-200);
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

.required {
  color: var(--p-red-500, #ef4444);
}

.form-error {
  color: var(--p-red-500, #ef4444);
  font-size: 0.8rem;
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

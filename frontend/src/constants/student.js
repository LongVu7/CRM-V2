import { getEnumOptions } from '@/i18n'

export const genderOptions = getEnumOptions('gender', ['Male', 'Female'])

export const classOptions = getEnumOptions('studentClass', [
  'NONE',
  'GRADE_11',
  'GRADE_12',
  'FREELANCE'
])

export const schoolTypeOptions = getEnumOptions('schoolType', [
  'NONE',
  'A_STAR',
  'A',
  'B',
  'C',
  'D'
])

export const gpaOptions = getEnumOptions('gpa', [
  'LOWER_21',
  'G11_21_TO_23',
  'G12_SEM1_21_TO_23',
  'G12_21_TO_23',
  'G11_24_TO_26',
  'G12_SEM1_24_TO_26',
  'G12_24_TO_26',
  'G11_HIGHER_26',
  'G12_SEM1_HIGHER_26',
  'G12_HIGHER_26',
  'OTHER'
])

export const programScoreOptions = getEnumOptions('programScore', [
  'TALENT_SCHOLARSHIP',
  'OTHER_SCHOLARSHIP',
  'ELIGIBLE_NO_SCHOLARSHIP',
  'PENDING_REVIEW',
  'NOT_ELIGIBLE',
  'OTHER'
])

export const englishCertOptions = getEnumOptions('englishCertificate', [
  'IELTS',
  'TOEFL',
  'TOEIC',
  'VSTEP',
  'APTIS',
  'LINGUASKILL',
  'PEIC',
  'CAMBRIDGE_EXAM',
  'PTE',
  'other'
])

export const ALLOWED_STUDENT_FIELDS = [
  'fullName', 'gender', 'email', 'mobile', 'otherPhone', 'birthDate', 'primaryAddress'
]

export const ALLOWED_EDUCATION_FIELDS = [
  'schoolId', 'oldProvinceId', 'newProvinceId', 'countryId', 'provinceGroup', 'schoolType', 'class'
]

export const ALLOWED_SR_FIELDS = [
  'interestedMajorId', 'specificMajorId', 'admissionYear', 'englishCertificate', 'gpa', 'programScore'
]

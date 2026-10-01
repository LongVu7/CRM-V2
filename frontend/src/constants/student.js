export const genderOptions = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' }
]

export const classOptions = [
  { label: 'Lớp 11', value: 'GRADE_11' },
  { label: 'Lớp 12', value: 'GRADE_12' },
  { label: 'Thí sinh tự do', value: 'FREELANCE' }
]

export const schoolTypeOptions = [
  { label: 'A*', value: 'A_STAR' },
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'C', value: 'C' },
  { label: 'D', value: 'D' }
]

export const gpaOptions = [
  { label: '3 môn <21đ', value: 'LOWER_21' },
  { label: '3 môn lớp 11 từ 21-23đ', value: 'G11_21_TO_23' },
  { label: '3 môn HK1 12 từ 21-23đ', value: 'G12_SEM1_21_TO_23' },
  { label: '3 môn cả năm 12 từ 21-23đ', value: 'G12_21_TO_23' },
  { label: '3 môn lớp 11 từ 24-26đ', value: 'G11_24_TO_26' },
  { label: '3 môn HK1 12 từ 24-26đ', value: 'G12_SEM1_24_TO_26' },
  { label: '3 môn cả năm 12 từ 24-26đ', value: 'G12_24_TO_26' },
  { label: '3 môn lớp 11 >26đ', value: 'G11_HIGHER_26' },
  { label: '3 môn HK1 12 >26đ', value: 'G12_SEM1_HIGHER_26' },
  { label: '3 môn cả năm 12 >26đ', value: 'G12_HIGHER_26' },
  { label: 'Khác', value: 'OTHER' }
]

export const programScoreOptions = [
  { label: 'Đạt xét HB Talent', value: 'TALENT_SCHOLARSHIP' },
  { label: 'Đạt xét HB khác', value: 'OTHER_SCHOLARSHIP' },
  { label: 'Đạt - không có HB', value: 'ELIGIBLE_NO_SCHOLARSHIP' },
  { label: 'Đang chờ xét duyệt', value: 'PENDING_REVIEW' },
  { label: 'Chưa đủ điểm đầu vào', value: 'NOT_ELIGIBLE' },
  { label: 'Khác', value: 'OTHER' }
]

export const englishCertOptions = [
  { label: 'IELTS', value: 'IELTS' },
  { label: 'TOEFL', value: 'TOEFL' },
  { label: 'TOEIC', value: 'TOEIC' },
  { label: 'VSTEP', value: 'VSTEP' },
  { label: 'APTIS', value: 'APTIS' },
  { label: 'Linguaskill', value: 'LINGUASKILL' },
  { label: 'PEIC', value: 'PEIC' },
  { label: 'Cambridge Exam', value: 'CAMBRIDGE_EXAM' },
  { label: 'PTE', value: 'PTE' },
  { label: 'Other', value: 'other' }
]

export const ALLOWED_STUDENT_FIELDS = [
  'fullName', 'gender', 'email', 'mobile', 'otherPhone', 'birthDate', 'parentPhone', 'primaryAddress'
]

export const ALLOWED_EDUCATION_FIELDS = [
  'schoolId', 'newProvinceId', 'countryId', 'provinceGroup', 'schoolType', 'class'
]

export const ALLOWED_SR_FIELDS = [
  'interestedMajorId', 'specificMajorId', 'admissionYear', 'englishCertificate', 'gpa', 'programScore'
]

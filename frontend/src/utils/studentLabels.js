import { tEnum } from '@/i18n'

export const getClassLabel = (value) => tEnum('studentClass', value)
export const getSchoolTypeLabel = (value) => tEnum('schoolType', value)
export const getGpaLabel = (value) => tEnum('gpa', value)
export const getProgramScoreLabel = (value) => tEnum('programScore', value)
export const getEnglishCertLabel = (value) => tEnum('englishCertificate', value)

export const getGenderLabel = (gender) => tEnum('gender', gender)

export const getGenderSeverity = (gender) => {
  if (!gender) return 'secondary'
  const g = String(gender).trim().toLowerCase()
  if (g === 'male' || g === 'nam') return 'info'
  if (g === 'female' || g === 'nu' || g === 'nữ') return 'warn'
  return 'secondary'
}

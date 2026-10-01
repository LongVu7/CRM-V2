import { classOptions, schoolTypeOptions, gpaOptions, programScoreOptions, englishCertOptions } from '@/constants/student'

function buildLabelMap(options) {
  const map = {}
  for (const opt of options) {
    map[opt.value] = opt.label
  }
  return map
}

const classLabelMap = buildLabelMap(classOptions)
const schoolTypeLabelMap = buildLabelMap(schoolTypeOptions)
const gpaLabelMap = buildLabelMap(gpaOptions)
const programScoreLabelMap = buildLabelMap(programScoreOptions)
const englishCertLabelMap = buildLabelMap(englishCertOptions)

export const getClassLabel = (value) => classLabelMap[value] || value || '—'
export const getSchoolTypeLabel = (value) => schoolTypeLabelMap[value] || value || '—'
export const getGpaLabel = (value) => gpaLabelMap[value] || value || '—'
export const getProgramScoreLabel = (value) => programScoreLabelMap[value] || value || '—'
export const getEnglishCertLabel = (value) => englishCertLabelMap[value] || value || '—'

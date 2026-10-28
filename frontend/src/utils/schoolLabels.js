import { tEnum } from '@/i18n'

export const formatSchoolType = (type) => tEnum('schoolType', type)

export const typeSeverity = (type) => {
  if (type === 'A_STAR') return 'info'
  if (type === 'A') return 'warn'
  if (type === 'B') return 'success'
  if (type === 'C') return 'danger'
  if (type === 'D') return 'secondary'
  return 'secondary'
}

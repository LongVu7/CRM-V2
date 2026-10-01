export const formatSchoolType = (type) => {
  if (type === 'A_STAR') return 'A*'
  if (type === 'A') return 'A'
  if (type === 'B') return 'B'
  if (type === 'C') return 'C'
  if (type === 'D') return 'D'
  return type
}

export const typeSeverity = (type) => {
  if (type === 'A_STAR') return 'info'
  if (type === 'A') return 'warn'
  if (type === 'B') return 'success'
  if (type === 'C') return 'danger'
  if (type === 'D') return 'secondary'
  return 'secondary'
}

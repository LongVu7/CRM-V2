import { tEnum } from '@/i18n'

export const getEventLabel = (value) => tEnum('eventName', value)
export const getCompensationLabel = (value) => tEnum('compensationStatus', value)

/**
 * Format an array of event name enums into a comma-separated label string.
 */
export const formatEventNames = (events) => {
  if (!events || events.length === 0) return '—'
  return events.map(getEventLabel).join(', ')
}

/**
 * Extract a specific status level label from the nested statusData object.
 */
export const getStatusLevel = (statusData, level) => {
  if (!statusData) return '—'

  if (level === 'interaction') {
    if (statusData.level === 'interaction') return statusData.label
    if (statusData.level === 'general' && statusData.parent) return statusData.parent.label
    if (statusData.level === 'detail' && statusData.parent?.parent) return statusData.parent.parent.label
  }

  if (level === 'general') {
    if (statusData.level === 'general') return statusData.label
    if (statusData.level === 'detail' && statusData.parent) return statusData.parent.label
  }

  if (level === 'detail') {
    if (statusData.level === 'detail') return statusData.label
  }

  return '—'
}

/**
 * Extract a specific source level label from the nested sourceData object.
 */
export const getSourceLevel = (sourceData, level) => {
  if (!sourceData) return '—'

  if (level === 'source') {
    if (sourceData.level === 'source') return sourceData.label
    if (sourceData.level === 'sourceDetail' && sourceData.parent) return sourceData.parent.label
    if (sourceData.level === 'approachMethod' && sourceData.parent?.parent) return sourceData.parent.parent.label
  }

  if (level === 'sourceDetail') {
    if (sourceData.level === 'sourceDetail') return sourceData.label
    if (sourceData.level === 'approachMethod' && sourceData.parent) return sourceData.parent.label
  }

  if (level === 'approachMethod') {
    if (sourceData.level === 'approachMethod') return sourceData.label
  }

  return '—'
}

export const STATUS_SEVERITY_BY_NAME = {
  // Success
  payment_completed: 'success',
  payment_completed_nb: 'success',
  application_completed: 'success',
  application_submitted: 'success',
  nb: 'success',

  // Info
  interacted: 'info',
  interested: 'info',
  scheduled_callback: 'info',
  scheduled_application: 'info',
  payment_scheduled: 'info',
  application_scheduled: 'info',

  // Warn
  pending: 'warn',
  future: 'warn',
  considering: 'warn',
  considering_follow_up: 'warn',
  follow_up: 'warn',
  following: 'warn',

  // Danger
  not_interested: 'danger',
  wrong_number: 'danger',
  incorrect_number: 'danger',
  no_answer: 'danger',
  unreachable: 'danger',
  not_interacted: 'danger',
  cancelled: 'danger',
  cancelled_not_interested: 'danger'
}

/**
 * Determine PrimeVue tag severity for a status node or status label.
 */
export const getStatusSeverity = (statusOrLabel) => {
  if (!statusOrLabel || statusOrLabel === '—') return 'secondary'

  if (typeof statusOrLabel === 'object') {
    const name = (statusOrLabel.name || '').toLowerCase()
    if (STATUS_SEVERITY_BY_NAME[name]) {
      return STATUS_SEVERITY_BY_NAME[name]
    }
  }

  const name = typeof statusOrLabel === 'object' ? (statusOrLabel.name || '') : ''
  const label = typeof statusOrLabel === 'object' ? (statusOrLabel.label || '') : String(statusOrLabel)
  const text = (label + ' ' + name).toLowerCase()

  if (
    text.includes('nộp hồ sơ') || 
    text.includes('nộp phí') || 
    text.includes('đóng phí') || 
    text.includes('đóng học phí') || 
    text.includes('nhập học') || 
    text.includes('thành công') ||
    text.includes('payment_completed') ||
    text.includes('application_submitted')
  ) {
    return 'success'
  }

  if (
    (text.includes('tương tác') && !text.includes('chưa tương tác') && !text.includes('không tương tác')) ||
    (text.includes('interacted') && !text.includes('not_interacted')) ||
    text.includes('quan tâm') ||
    text.includes('hẹn') ||
    text.includes('follow') ||
    text.includes('interested') ||
    text.includes('scheduled')
  ) {
    return 'info'
  }

  if (
    text.includes('cân nhắc') ||
    text.includes('tương lai') ||
    text.includes('chưa xử lý') ||
    text.includes('chờ') ||
    text.includes('considering') ||
    text.includes('future') ||
    text.includes('pending')
  ) {
    return 'warn'
  }

  if (
    text.includes('sai') ||
    text.includes('hủy') ||
    text.includes('từ chối') ||
    text.includes('không') ||
    text.includes('wrong_number') ||
    text.includes('not_interested') ||
    text.includes('not_interacted') ||
    text.includes('cancelled')
  ) {
    return 'danger'
  }

  return 'secondary'
}

export const getStatusTagSeverity = getStatusSeverity

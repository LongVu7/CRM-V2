import { eventOptions, compensationOptions } from '@/constants/inquiry'

function buildLabelMap(options) {
  const map = {}
  for (const opt of options) {
    map[opt.value] = opt.label
  }
  return map
}

const eventLabelMap = buildLabelMap(eventOptions)
const compensationLabelMap = buildLabelMap(compensationOptions)

export const getEventLabel = (value) => eventLabelMap[value] || value || '—'
export const getCompensationLabel = (value) => compensationLabelMap[value] || value || '—'

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

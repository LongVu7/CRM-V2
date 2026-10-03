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

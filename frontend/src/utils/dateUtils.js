// ─── Shared date formatting utilities

/**
 * Format a date string as DD-MM-YYYY.
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}

/**
 * Format a date string in a readable locale format (e.g. "Sep 17, 2026, 01:30 PM").
 */
export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format a Date object or date string as YYYY-MM-DD.
 */
export const formatDateYMD = (date) => {
  if (!date) return null
  if (typeof date === 'string') return date
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Format a date string in a compact list format (e.g. "Sep 17, 2026").
 */
export const formatCompactDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const month = d.toLocaleString('en-US', { month: 'short' })
  return `${month} ${d.getDate()}, ${d.getFullYear()}`
}

/**
 * Format a time string in a compact list format (e.g. "01:30 PM").
 */
export const formatCompactTime = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}


import { createI18n } from 'vue-i18n'
import vi from './locales/vi'
import en from './locales/en'

const savedLocale = localStorage.getItem('app_locale') || 'vi'

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: {
    vi,
    en
  }
})

/**
 * Translate an enum value safely.
 * Usage: tEnum('studentClass', 'GRADE_11') => 'Lớp 11'
 */
export const tEnum = (category, value, defaultVal) => {
  if (value === undefined || value === null || value === '') {
    return defaultVal !== undefined ? defaultVal : '—'
  }
  const key = `enums.${category}.${value}`
  if (i18n.global.te(key)) {
    return i18n.global.t(key)
  }
  return defaultVal !== undefined ? defaultVal : (value || '—')
}


export const getEnumOptions = (category, keys) => {
  return keys.map((key) => ({
    label: tEnum(category, key),
    value: key
  }))
}

export default i18n

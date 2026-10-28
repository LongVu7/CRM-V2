import { getEnumOptions } from '@/i18n'

export const eventOptions = getEnumOptions('eventName', [
  'TALKSHOW',
  'LIVESTREAM',
  'OPEN_DAY',
  'COFFEE_TALK',
  'CAMPUS_TOUR',
  'WORKSHOP',
  'ONE_ON_ONE_CONSULTATION'
])

export const compensationOptions = getEnumOptions('compensationStatus', [
  'REPORTED',
  'COMPENSATED'
])

export const priorityOptions = getEnumOptions('priority', [
  'I',
  'II',
  'III',
  'IV',
  'V'
])

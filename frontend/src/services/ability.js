import { createMongoAbility } from '@casl/ability'

export const ability = createMongoAbility([])

/**
 * Parse a single permission code into { subject, action }.
 * Subjects stay lowercase to match backend codes.
 */
export function parsePermission(code) {
  const dotIndex = code.indexOf('.')

  if (dotIndex <= 0 || dotIndex === code.length - 1) {
    throw new Error(`Invalid permission code: ${code}`)
  }

  return {
    subject: code.slice(0, dotIndex),
    action: code.slice(dotIndex + 1)
  }
}

/**
 * Check if the current CASL ability satisfies a permission requirement.
 * Accepts a single permission code string or an array of codes (logical OR).
 * Returns true if ANY permission matches, or if permission is empty/falsy.
 */
export function canAccessPermission(permission) {
  if (!permission) return true
  const list = Array.isArray(permission) ? permission : [permission]
  if (list.length === 0) return true

  return list.some((p) => {
    try {
      const { action, subject } = parsePermission(p)
      return ability.can(action, subject)
    } catch {
      return false
    }
  })
}

/**
 * Transform an array of permission codes into CASL rules.
 * Generates exact parsed rules, and for action-scoped permissions (e.g. read_all, read_assigned),
 * also generates the base verb (e.g. 'read') to seamlessly support UI and route guards.
 */
export function permissionsToCaslRules(permissionCodes = []) {
  if (!Array.isArray(permissionCodes)) return []
  const rules = []
  const seen = new Set()

  const addRule = (subject, action) => {
    const key = `${subject}:${action}`
    if (!seen.has(key)) {
      seen.add(key)
      rules.push({ subject, action })
    }
  }

  for (const code of permissionCodes) {
    try {
      const parsed = parsePermission(code)
      addRule(parsed.subject, parsed.action)

      // If action is scoped (e.g. read_all, read_group, read_assigned), also grant base verb
      const subParts = parsed.action.split('_')
      if (subParts.length > 1) {
        addRule(parsed.subject, subParts[0])
      }
    } catch {
      // Ignore invalid permission codes
    }
  }

  return rules
}

import { createMongoAbility, subject } from '@casl/ability'

export const ability = createMongoAbility([])

/**
 * Check if the current user can perform an action on a specific record or subject type.
 */
export function canPerform(action, subjectName, record = null) {
  if (!record) {
    return ability.can(action, subjectName)
  }
  return ability.can(action, subject(subjectName, record))
}

/**
 * Parse a single permission code into { subject, action }.
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

export function permissionsToCaslRules(permissionCodes = []) {
  return permissionCodes.map(parsePermission)
}

export { subject }

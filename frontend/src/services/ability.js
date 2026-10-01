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
 * Transform an array of permission codes into CASL rules.
 * Delegates to parsePermission — single parsing implementation.
 */
export function permissionsToCaslRules(permissionCodes = []) {
  return permissionCodes.map(parsePermission)
}

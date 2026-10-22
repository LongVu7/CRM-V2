import { AbilityBuilder, createMongoAbility, subject } from '@casl/ability'

export const ability = createMongoAbility([])

/**
 * Builds dynamic CASL rules from authenticated user profile and permissions
 * supporting ALL, TEAM_ONLY, and OWNER_ONLY scopes.
 *
 * @param {object} user - User profile object from /api/auth/me or login
 * @returns {Array} CASL rules array
 */
export function buildAbilityRules(user = {}) {
  const { can, rules } = new AbilityBuilder(createMongoAbility)

  if (!user) return rules

  // 1. Super-administrator bypass
  if (user.roleName === 'admin') {
    can('manage', 'all')
    return rules
  }

  const accountId = user.id !== undefined ? user.id : user.accountId
  const teamIds = Array.isArray(user.teamIds) ? user.teamIds : []
  const rolePermissions = Array.isArray(user.rolePermissions) ? user.rolePermissions : []
  const teamPermissions = Array.isArray(user.teamPermissions) ? user.teamPermissions : []
  const allPermissions = [...rolePermissions, ...teamPermissions]

  // Fallback for legacy permission string codes array
  if (allPermissions.length === 0 && Array.isArray(user.permissions)) {
    for (const code of user.permissions) {
      if (typeof code === 'string' && code.includes('.')) {
        const dotIndex = code.indexOf('.')
        can(code.slice(dotIndex + 1).toLowerCase(), code.slice(0, dotIndex).toLowerCase())
      }
    }
    return rules
  }

  for (const perm of allPermissions) {
    if (!perm.action || !perm.resource) continue

    const action = perm.action.toLowerCase()
    const resourceSubject = perm.resource.toLowerCase()
    const scope = (perm.scope || 'ALL').toUpperCase()

    if (scope === 'ALL') {
      can(action, resourceSubject)
    } else if (scope === 'TEAM_ONLY') {
      if (resourceSubject === 'team') {
        can(action, resourceSubject, { id: { $in: teamIds } })
      } else {
        can(action, resourceSubject, { teamId: { $in: teamIds } })
        can(action, resourceSubject, { 'team.id': { $in: teamIds } })
      }
    } else if (scope === 'OWNER_ONLY') {
      if (resourceSubject === 'team') {
        can(action, resourceSubject, { leaderId: accountId })
        can(action, resourceSubject, { 'leader.id': accountId })
      } else {
        can(action, resourceSubject, { assignedToId: accountId })
        can(action, resourceSubject, { 'assignedTo.id': accountId })
      }
    }
  }

  return rules
}

/**
 * Check if the current user can perform an action on a specific record or subject type.
 *
 * @param {string} action - e.g. 'read', 'update', 'delete'
 * @param {string} subjectName - e.g. 'inquiry', 'student', 'team'
 * @param {object|null} [record] - Specific record to evaluate conditions against
 * @returns {boolean}
 */
export function canPerform(action, subjectName, record = null) {
  if (!record) {
    return ability.can(action, subjectName)
  }
  return ability.can(action, subject(subjectName, record))
}

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

export { subject }

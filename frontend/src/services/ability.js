import { AbilityBuilder, createMongoAbility, subject } from '@casl/ability'

export const ability = createMongoAbility([])

const OWNER_FIELD_MAP = {
  team: ['leaderId', 'leader.id'],
  campaign: ['ownerId', 'owner.id']
}

function getOwnerFields(subject) {
  return OWNER_FIELD_MAP[subject] || ['assignedToId', 'assignedTo.id']
}

/**
 * Builds dynamic CASL rules from authenticated user profile and permissions
 * supporting ALL, TEAM_ONLY, and OWNER_ONLY scopes over authorized team subtrees.
 */
export function buildAbilityRules(user = {}) {
  const { can, rules } = new AbilityBuilder(createMongoAbility)

  if (!user) return rules

  // 1. Super-administrator bypass
  const roleName = user.roleName || user.role?.name || ''
  if (roleName.toLowerCase() === 'admin' || roleName.toLowerCase() === 'administrator') {
    can('manage', 'all')
    return rules
  }

  const accountId = user.id !== undefined ? user.id : user.accountId
  const teamIds = Array.isArray(user.authorizedTeamIds)
    ? user.authorizedTeamIds
    : (Array.isArray(user.teamIds) ? user.teamIds : [])
  const authorizedAccountIds = Array.isArray(user.authorizedAccountIds)
    ? user.authorizedAccountIds
    : []
  const permissions = Array.isArray(user.rolePermissions) ? user.rolePermissions : []

  // Fallback for legacy permission string codes array
  if (permissions.length === 0 && Array.isArray(user.permissions)) {
    for (const code of user.permissions) {
      if (typeof code === 'string' && code.includes('.')) {
        const dotIndex = code.indexOf('.')
        can(code.slice(dotIndex + 1).toLowerCase(), code.slice(0, dotIndex).toLowerCase())
      }
    }
    return rules
  }

  const grantOwnerAccess = (action, sub) => {
    for (const field of getOwnerFields(sub)) {
      can(action, sub, { [field]: accountId })
    }
    if (sub === 'lead' && accountId) {
      can(action, sub, { createdById: accountId, assignedToId: null })
    }
  }

  const grantTeamAccess = (action, sub) => {
    if (sub === 'team') {
      can(action, sub, { id: { $in: teamIds } })
      return
    }
    if (sub === 'lead') {
      grantOwnerAccess(action, sub)
      if (authorizedAccountIds.length > 0) {
        can(action, sub, { assignedToId: { $in: authorizedAccountIds } })
        can(action, sub, { 'assignedTo.id': { $in: authorizedAccountIds } })
      }
      return
    }
    if (teamIds.length > 0) {
      can(action, sub, { teamId: { $in: teamIds } })
      can(action, sub, { 'team.id': { $in: teamIds } })
    }
  }

  for (const perm of permissions) {
    if (!perm.action || !perm.resource) continue

    const action = perm.action.toLowerCase()
    const resourceSubject = perm.resource.toLowerCase()
    const scope = (perm.scope || 'ALL').toUpperCase()

    if (scope === 'ALL') {
      can(action, resourceSubject)
    } else if (scope === 'TEAM_ONLY') {
      grantTeamAccess(action, resourceSubject)
    } else if (scope === 'OWNER_ONLY') {
      grantOwnerAccess(action, resourceSubject)
    }
  }

  return rules
}

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

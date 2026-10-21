const { AbilityBuilder } = require('@casl/ability');
const { createPrismaAbility, accessibleBy } = require('@casl/prisma');

/**
 * Normalizes subject/resource name to lowercase for consistent CASL ability matching
 */
function normalizeSubject(subject) {
  if (!subject) return subject;
  return typeof subject === 'string' ? subject.toLowerCase() : subject;
}

/**
 * Constructs a Prisma-capable CASL Ability instance reflecting the user's role
 * and team permissions compiled with dynamic scopes.
 *
 * @param {Object} account
 * @param {number} [account.accountId]
 * @param {number} [account.id]
 * @param {number|null} [account.roleId]
 * @param {string|null} [account.roleName]
 * @param {number[]} [account.teamIds]
 * @param {Array<{ code?: string, action: string, resource: string, scope?: string }>} [account.rolePermissions]
 * @param {Array<{ code?: string, action: string, resource: string, scope?: string }>} [account.teamPermissions]
 * @returns {import('@casl/prisma').PureAbility}
 */
function defineAbilityFor(account = {}) {
  const { can, build } = new AbilityBuilder(createPrismaAbility);

  const accountId = account.accountId !== undefined ? account.accountId : account.id;
  const roleName = account.roleName;
  const teamIds = Array.isArray(account.teamIds) ? account.teamIds : [];

  // 1. Super-administrator bypass
  if (roleName === 'admin') {
    can('manage', 'all');
    return build();
  }

  // 2. Compile dynamic permissions (role + teams)
  const rolePermissions = Array.isArray(account.rolePermissions) ? account.rolePermissions : [];
  const teamPermissions = Array.isArray(account.teamPermissions) ? account.teamPermissions : [];
  const allPermissions = [...rolePermissions, ...teamPermissions];

  for (const perm of allPermissions) {
    if (!perm.action || !perm.resource) continue;

    const action = perm.action.toLowerCase();
    const subject = normalizeSubject(perm.resource);
    const scope = (perm.scope || 'ALL').toUpperCase();

    if (scope === 'ALL') {
      can(action, subject);
    } else if (scope === 'TEAM_ONLY') {
      if (subject === 'team') {
        can(action, subject, { id: { in: teamIds } });
      } else {
        can(action, subject, { teamId: { in: teamIds } });
      }
    } else if (scope === 'OWNER_ONLY') {
      if (subject === 'team') {
        can(action, subject, { leaderId: accountId });
      } else {
        can(action, subject, { assignedToId: accountId });
      }
    }
  }

  return build();
}

/**
 * Translates CASL ability conditions into an idiomatic Prisma `where` clause.
 *
 * @param {import('@casl/prisma').PureAbility} ability
 * @param {string} action - e.g. 'read', 'update'
 * @param {string} subjectName - e.g. 'inquiry', 'student', 'team'
 * @returns {object} Prisma WHERE condition
 */
function buildPrismaScope(ability, action, subjectName) {
  if (!ability || typeof ability.can !== 'function') {
    return { OR: [] };
  }

  const normalizedSubject = normalizeSubject(subjectName);
  const normalizedAction = (action || '').toLowerCase();

  // If user cannot perform action on subject at all, return impossible condition
  if (!ability.can(normalizedAction, normalizedSubject)) {
    return { OR: [] };
  }

  try {
    const accessible = accessibleBy(ability, normalizedAction);
    if (typeof accessible.ofType === 'function') {
      return accessible.ofType(normalizedSubject);
    }
    return accessible[normalizedSubject] !== undefined ? accessible[normalizedSubject] : {};
  } catch (err) {
    return { OR: [] };
  }
}

module.exports = {
  defineAbilityFor,
  buildPrismaScope,
  normalizeSubject
};

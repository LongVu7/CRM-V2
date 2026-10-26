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
 * and permissions compiled with dynamic scopes over authorized team subtrees.
 */
function defineAbilityFor(account = {}) {
  const { can, build } = new AbilityBuilder(createPrismaAbility);

  const accountId = account.accountId !== undefined ? account.accountId : account.id;
  const roleName = account.roleName || (account.role && account.role.name);
  const authorizedTeamIds = Array.isArray(account.authorizedTeamIds)
    ? account.authorizedTeamIds
    : (Array.isArray(account.teamIds) ? account.teamIds : []);

  // 1. Super-administrator bypass
  if (roleName === 'admin' || roleName === 'administrator') {
    can('manage', 'all');
    return build();
  }

  // 2. Compile dynamic permissions purely from Role (Account Role/Contextual Team Role)
  const permissions = Array.isArray(account.permissions)
    ? account.permissions
    : (Array.isArray(account.rolePermissions) ? account.rolePermissions : []);

  for (const perm of permissions) {
    if (!perm.action || !perm.resource) continue;

    const action = perm.action.toLowerCase();
    const subject = normalizeSubject(perm.resource);
    const scope = (perm.scope || 'ALL').toUpperCase();

    if (scope === 'ALL') {
      can(action, subject);
    } else if (scope === 'TEAM_ONLY') {
      if (subject === 'team') {
        can(action, subject, { id: { in: authorizedTeamIds } });
      } else {
        can(action, subject, { teamId: { in: authorizedTeamIds } });
      }
    } else if (scope === 'OWNER_ONLY') {
      if (subject === 'team') {
        can(action, subject, { leaderId: accountId });
      } else if (subject === 'campaign') {
        can(action, subject, { ownerId: accountId });
      } else {
        can(action, subject, { assignedToId: accountId });
      }
    }
  }

  return build();
}

/**
 * Translates CASL ability conditions into an idiomatic Prisma `where` clause.
 * action - e.g. 'read', 'update'
 * subjectName - e.g. 'inquiry', 'student', 'team'
 * Returns {object} Prisma WHERE condition
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

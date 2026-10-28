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
  const roleName = (account.roleName || account.role?.name || '').toLowerCase();

  // 1. Super-administrator bypass
  if (roleName === 'admin' || roleName === 'administrator') {
    can('manage', 'all');
    return build();
  }

  // 2. Normalize inputs
  const authorizedTeamIds = Array.isArray(account.authorizedTeamIds)
    ? account.authorizedTeamIds
    : (Array.isArray(account.teamIds) ? account.teamIds : []);
  const authorizedAccountIds = Array.isArray(account.authorizedAccountIds)
    ? account.authorizedAccountIds
    : [];
  const permissions = Array.isArray(account.permissions)
    ? account.permissions
    : (Array.isArray(account.rolePermissions) ? account.rolePermissions : []);

  // Deduplicate CASL rules
  const addedRules = new Set();
  const canUnique = (act, sub, cond) => {
    const key = `${act}:${sub}:${JSON.stringify(cond || {})}`;
    if (!addedRules.has(key)) {
      addedRules.add(key);
      if (cond) {
        can(act, sub, cond);
      } else {
        can(act, sub);
      }
    }
  };

  // Grants access to user's own records (OWNER_ONLY)
  const grantOwnerAccess = (act, sub) => {
    if (sub === 'team') {
      canUnique(act, sub, { leaderId: accountId });
    } else if (sub === 'campaign') {
      canUnique(act, sub, { ownerId: accountId });
    } else if (sub === 'inquiry') {
      canUnique(act, sub, { assignedToId: accountId });
      if (accountId) {
        canUnique(act, sub, { createdById: accountId, assignedToId: null });
      }
    } else {
      canUnique(act, sub, { assignedToId: accountId });
    }
  };

  // Grants access to team records (TEAM_ONLY: owner access + team/member records)
  const grantTeamAccess = (act, sub) => {
    if (sub === 'team') {
      if (authorizedTeamIds.length > 0) {
        canUnique(act, sub, { id: { in: authorizedTeamIds } });
      }
      return;
    }

    grantOwnerAccess(act, sub);

    if (sub === 'inquiry') {
      if (authorizedAccountIds.length > 0) {
        canUnique(act, sub, { assignedToId: { in: authorizedAccountIds } });
      }
    } else if (sub === 'campaign') {
      if (authorizedTeamIds.length > 0) {
        canUnique(act, sub, { teamId: { in: authorizedTeamIds } });
      }
    } else if (authorizedTeamIds.length > 0) {
      canUnique(act, sub, { teamId: { in: authorizedTeamIds } });
    }
  };

  // 3. Compile dynamic permissions purely from Role
  for (const perm of permissions) {
    if (!perm?.action || !perm?.resource) 
      continue;

    const action = perm.action.toLowerCase();
    const subject = normalizeSubject(perm.resource);
    const scope = (perm.scope || 'ALL').toUpperCase();

    if (scope === 'ALL') {
      canUnique(action, subject);
    } else if (scope === 'TEAM_ONLY') {
      grantTeamAccess(action, subject);
    } else if (scope === 'OWNER_ONLY') {
      grantOwnerAccess(action, subject);
    }
  }

  return build();
}

/**
 * Translates CASL ability conditions into an idiomatic Prisma `where` clause.
 */
function buildPrismaScope(ability, action, subjectName) {
  if (!ability || typeof ability.can !== 'function') {
    return { OR: [] };
  }

  const normalizedSubject = normalizeSubject(subjectName);
  const normalizedAction = (action || '').toLowerCase();

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

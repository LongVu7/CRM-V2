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
 * Checks if the user is a super-administrator
 */
function isAdmin(user) {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  const roleName = (user.roleName || user.role?.name || '').toLowerCase();
  return roleName === 'admin' || roleName === 'administrator';
}

/**
 * Resolves the effective permission scope ('ALL', 'TEAM_ONLY', 'OWNER_ONLY', or null)
 * for a given user, action, and resource.
 */
function getEffectiveScope(user, action, resource) {
  if (!user) return null;
  if (isAdmin(user)) return 'ALL';

  const permissions = Array.isArray(user.rolePermissions)
    ? user.rolePermissions
    : (Array.isArray(user.permissions) ? user.permissions : []);

  //Normalize action & resource
  const normAction = (action || '').toLowerCase();
  const normResource = normalizeSubject(resource);

  const matched = permissions.filter(p => {
    if (!p) return false;
    const pRes = normalizeSubject(p.resource || p.permission?.resource);
    const pAct = (p.action || p.permission?.action || '').toLowerCase();
    return pRes === normResource && (pAct === normAction || pAct === 'manage' || !pAct);
  });

  if (matched.length === 0) return null;
  if (matched.some(p => (p.scope || '').toUpperCase() === 'ALL')) return 'ALL';
  if (matched.some(p => (p.scope || '').toUpperCase() === 'TEAM_ONLY')) return 'TEAM_ONLY';
  if (matched.some(p => (p.scope || '').toUpperCase() === 'OWNER_ONLY')) return 'OWNER_ONLY';
  return null;
}

/**
 * Resolves effective scope and authorized boundaries for any given resource
 */
function resolveDataScope(user, action, resource) {
  const effectiveScope = getEffectiveScope(user, action, resource) || (isAdmin(user) ? 'ALL' : 'OWNER_ONLY');
  return {
    effectiveScope,
    authorizedTeamIds: user?.authorizedTeamIds || [],
    authorizedAccountIds: user?.authorizedAccountIds || []
  };
}

/**
 * Normalizes Prisma CASL rules for consumption by client-side MongoAbility (@casl/ability).
 * Maps Prisma `{ in: [...] }` operators to Mongo `{ $in: [...] }`.
 */
function serializeRulesForClient(rules = []) {
  return rules.map(rule => {
    if (!rule.conditions) return rule;
    const conditions = {};
    for (const [key, val] of Object.entries(rule.conditions)) {
      conditions[key] = (val && Array.isArray(val.in)) ? { $in: val.in } : val;
    }
    return { ...rule, conditions };
  });
}

function finalizeAbility(build) {
  const ability = build();
  ability.clientRules = serializeRulesForClient(ability.rules);
  return ability;
}

/**
 * Constructs a Prisma-capable CASL Ability instance reflecting the user's role
 * and permissions compiled with dynamic scopes over authorized team subtrees.
 */
function defineAbilityFor(account = {}) {
  const { can, build } = new AbilityBuilder(createPrismaAbility);

  const accountId = account.accountId !== undefined ? account.accountId : account.id;

  // 1. Super-administrator bypass
  if (isAdmin(account)) {
    can('manage', 'all');
    return finalizeAbility(build);
  }

  // Define ability for Collaborator role
  const roleName = (account.roleName || account.role?.name || '').toLowerCase();
  const isCollab = roleName === 'collaborator';
  if (isCollab && accountId) {
    can('read', 'lead', { createdById: accountId });
    can('update', 'lead', { createdById: accountId });
    can('create', 'lead');
    can('import', 'lead');
    return finalizeAbility(build);
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
    } else if (sub === 'lead') {
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

    if (sub === 'lead') {
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

  return finalizeAbility(build);
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
  serializeRulesForClient,
  normalizeSubject,
  isAdmin,
  getEffectiveScope,
  resolveDataScope
};

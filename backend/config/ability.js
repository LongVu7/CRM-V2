const { AbilityBuilder, createMongoAbility } = require('@casl/ability');

// ─── Static Role Hierarchy DAG ───────────────────────────────────────────────
// Higher roles automatically inherit all capabilities from lower roles.
// Hierarchy: admin -> manager -> member
const ROLE_HIERARCHY = {
  admin: ['manager', 'member'],
  manager: ['member'],
  member: []
};

// ─── Static Delegation Whitelist ────────────────────────────────────────────
// Defines the exact set of lower-tier permissions that each supervisory role
// is allowed to delegate to team members (Gate 1 of Dual-Gate Ceiling).
const DELEGATABLE_WHITELIST = {
  manager: [
    'inquiry.read',
    'inquiry.read_assigned',
    'inquiry.update',
    'inquiry.update_assigned',
    'inquiry.assign',
    'inquiry.export',
    'student.read',
    'student.update'
  ]
};

/**
 * Pure validator function for Dual-Gate Hybrid Delegation Ceiling.
 * Evaluates whether an actor can delegate requested permissions to a team member.
 *
 * @param {string} actorRole - Role name of the user performing delegation (e.g. 'manager', 'admin')
 * @param {string[]|Set<string>} teamPermissions - Active permissions granted to the team in DB (Gate 2)
 * @param {string[]} requestedPermissions - Array of permission codes requested for delegation
 * @returns {{ allowed: boolean, reason?: string, gate?: number, permission?: string }}
 */
function canDelegate(actorRole, teamPermissions, requestedPermissions = []) {
  if (actorRole === 'admin') {
    return { allowed: true };
  }

  const delegatableSet = new Set(DELEGATABLE_WHITELIST[actorRole] || []);
  const teamPermSet = new Set(teamPermissions || []);

  for (const perm of requestedPermissions) {
    // Gate 1: Must be in the static role whitelist
    if (!delegatableSet.has(perm)) {
      return {
        allowed: false,
        reason: 'DELEGATION_CEILING_VIOLATION',
        gate: 1,
        permission: perm,
        message: `Permission '${perm}' exceeds the delegatable ceiling for role '${actorRole}'.`
      };
    }

    // Gate 2: Must be an active permission assigned to the team in the database
    if (!teamPermSet.has(perm)) {
      return {
        allowed: false,
        reason: 'DELEGATION_CEILING_VIOLATION',
        gate: 2,
        permission: perm,
        message: `Permission '${perm}' is not active on this team and cannot be delegated.`
      };
    }
  }

  return { allowed: true };
}

/**
 * Build a CASL MongoAbility instance for the authenticated user based on role,
 * inherited hierarchy, and effective team/member permissions.
 *
 * @param {object} user - Hydrated user object
 * @param {string} user.roleName - Name of user's role ('admin', 'manager', 'member')
 * @param {Set<string>|string[]} user.permissions - Effective permissions
 * @returns {MongoAbility}
 */
function defineAbilityFor(user = {}) {
  const { can, build } = new AbilityBuilder(createMongoAbility);
  const roleName = user.roleName || 'member';

  // System Administrator has global god-mode capabilities
  if (roleName === 'admin') {
    can('manage', 'all');
    return build();
  }

  // Collect effective permissions (from role, team baseline, and member overrides)
  const effectivePerms = user.permissions instanceof Set
    ? user.permissions
    : new Set(user.permissions || []);

  // Parse each permission code: "resource.action" or "resource.action_scope"
  // e.g. "inquiry.read", "inquiry.read_all", "inquiry.read_assigned", "school.read"
  for (const code of effectivePerms) {
    if (!code || typeof code !== 'string') continue;

    // Grant capability on specific permission code: ability.can('inquiry.read_all', 'inquiry')
    const dotIndex = code.indexOf('.');
    if (dotIndex !== -1) {
      const resource = code.slice(0, dotIndex);
      const actionPart = code.slice(dotIndex + 1);

      // Register both exact code and base action
      can(code, resource);
      can(actionPart, resource);

      // Handle scoping suffixes: "read_all", "read_assigned", "read_team" -> also grants "read"
      const underscoreIndex = actionPart.indexOf('_');
      if (underscoreIndex !== -1) {
        const baseAction = actionPart.slice(0, underscoreIndex);
        can(baseAction, resource);
      }
    } else {
      can(code, 'all');
    }
  }

  return build();
}

module.exports = {
  ROLE_HIERARCHY,
  DELEGATABLE_WHITELIST,
  canDelegate,
  defineAbilityFor
};

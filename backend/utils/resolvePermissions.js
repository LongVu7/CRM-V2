/**
 * Resolves the effective operational permissions for an account.
 *
 * Rules:
 * 1. If an account is assigned to a group (groupId !== null && groupId !== undefined),
 *    the group's permission set is the SOLE authority.
 *    If the group has no permissions configured, the effective set is strictly empty ([])
 *    with ZERO fallback to the account's baseline role permissions.
 * 2. Fallback to the account's baseline role permissions applies ONLY when the account
 *    has no group assignment (groupId === null || groupId === undefined).
 *
 * @param {Object} account
 * @returns {string[]}
 */
function resolveEffectivePermissions(account) {
  if (!account) return [];

  // 1. Group assignment present: group permissions are the sole authority
  if (account.groupId !== null && account.groupId !== undefined) {
    const groupPerms = (account.group?.permissions || [])
      .map(gp => gp.permission?.code)
      .filter(Boolean);
    return [...new Set(groupPerms)];
  }

  // 2. Unassigned account: fallback to baseline role permissions
  const rolePerms = (account.role?.permissions || [])
    .map(rp => rp.permission?.code)
    .filter(Boolean);
  return [...new Set(rolePerms)];
}

module.exports = {
  resolveEffectivePermissions
};

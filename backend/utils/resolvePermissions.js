function resolveEffectivePermissions(account) {
  const rolePerms = (account.role?.permissions || []).map(rp => rp.permission?.code).filter(Boolean);
  const groupPerms = (account.group?.permissions || []).map(gp => gp.permission?.code).filter(Boolean);
  return [...new Set([...rolePerms, ...groupPerms])];
}

module.exports = {
  resolveEffectivePermissions
};

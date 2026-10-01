function resolveEffectivePermissions(account) {
  const rolePerms = (account.role?.permissions || []).map(rp => rp.permission.code)
  const groupPerms = (account.group?.permissions || []).map(gp => gp.permission.code)
  return [...new Set([...rolePerms, ...groupPerms])]
}

module.exports = {
  resolveEffectivePermissions
};

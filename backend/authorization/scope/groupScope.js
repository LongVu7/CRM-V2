const prisma = require('../../config/db');

// ─── Build Prisma WHERE scope for group queries
const buildGroupScope = (user) => {
  // Full expansion
  if (user.permissions.has('group.read_all')) return {};
  
  const scopeConditions = [];
  
  // Base scope: view groups they belong to
  scopeConditions.push({ accounts: { some: { id: user.accountId } } });

  // Managed expansion: view groups where they are the groupLeader
  if (user.permissions.has('group.read_managed')) {
    scopeConditions.push({ groupLeaderId: user.accountId });
  }

  if (scopeConditions.length > 1) {
    return { OR: scopeConditions };
  }

  return scopeConditions[0];
};

// ─── Ownership resolver for single group access
const resolveGroupOwnership = async (req) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return null;

  const scope = buildGroupScope(req.user);

  return prisma.userGroup.findFirst({
    where: { id, ...scope },
    include: {
      groupLeader: { select: { id: true, fullName: true, email: true } },
      accounts: {
        select: {
          id: true,
          fullName: true,
          email: true,
          isActive: true,
          role: { select: { id: true, name: true } }
        }
      }
    }
  });
};

module.exports = {
  buildGroupScope,
  resolveGroupOwnership
};

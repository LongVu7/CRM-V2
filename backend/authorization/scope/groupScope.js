const prisma = require('../../config/db');

// ─── Build Prisma WHERE scope for group read queries
const buildGroupScope = (user) => {
  // Full expansion for administrators
  if (user?.roleName === 'admin' || user?.permissions?.has('group.read_all')) {
    return {};
  }

  const scopeConditions = [];

  // Groups where they are designated as groupLeader
  if (user?.accountId) {
    scopeConditions.push({ groupLeaderId: user.accountId });
  }

  // Groups they belong to as members
  if (user?.permissions?.has('group.read') && user?.accountId) {
    scopeConditions.push({ accounts: { some: { id: user.accountId } } });
  }

  if (scopeConditions.length > 1) {
    return { OR: scopeConditions };
  }

  if (scopeConditions.length === 1) {
    return scopeConditions[0];
  }

  return { id: -1 }; // No access
};

// ─── Build Prisma WHERE scope for group management mutations (add/remove member, edit details)
const buildGroupManageScope = (user) => {
  // Full expansion for administrators
  if (user?.roleName === 'admin' || user?.permissions?.has('group.read_all')) {
    return {};
  }

  // Scoped strictly to groups they lead
  if (user?.accountId) {
    return { groupLeaderId: user.accountId };
  }

  return { id: -1 };
};

// ─── Ownership resolver for reading a single group
const resolveGroupOwnership = async (req) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return null;

  const group = await prisma.userGroup.findUnique({
    where: { id },
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

  if (!group) {
    const err = new Error('Group not found');
    err.status = 404;
    throw err;
  }

  const isAdmin = req.user?.roleName === 'admin' || req.user?.permissions?.has('group.read_all');
  if (isAdmin) {
    return group;
  }

  // Read access: designated group leader or group member with group.read
  const isLeader = group.groupLeaderId === req.user?.accountId;
  const isMember = group.accounts?.some(acc => acc.id === req.user?.accountId);
  if (!isLeader && !(isMember && req.user?.permissions?.has('group.read'))) {
    const err = new Error('Forbidden: You do not have permission to view this group');
    err.status = 403;
    throw err;
  }

  return group;
};

// ─── Ownership resolver for managing a group (update, add/remove member)
const resolveGroupManageOwnership = async (req) => {
  const group = await resolveGroupOwnership(req);

  const isAdmin = req.user?.roleName === 'admin' || req.user?.permissions?.has('group.read_all');
  if (isAdmin) {
    return group;
  }

  if (group.groupLeaderId !== req.user?.accountId) {
    const err = new Error('Forbidden: You can only manage groups you are designated to lead');
    err.status = 403;
    throw err;
  }

  return group;
};

const groupPermissions = {
  READ: ['group.read', 'group.read_all', 'group.read_managed'],
  UPDATE: ['group.update'],
  DELETE: ['group.delete'],
  CREATE: ['group.create'],
  ASSIGN_LEADER: ['group.leader.assign'],
  ASSIGN_PERMISSION: ['group.permission.assign']
};

module.exports = {
  groupPermissions,
  buildGroupScope,
  buildGroupManageScope,
  resolveGroupOwnership,
  resolveGroupManageOwnership
};


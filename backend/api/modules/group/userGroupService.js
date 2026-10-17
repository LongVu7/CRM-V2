const prisma = require('../../../config/db');
const { buildGroupScope } = require('../../../authorization/scope/groupScope');
const { validatePermissionIdsScopeConsistency } = require('./userGroupSchemas');

// Shared include shapes
const groupInclude = {
  groupLeader: {
    select: { id: true, fullName: true, email: true }
  },
  accounts: {
    select: {
      id: true,
      fullName: true,
      email: true,
      isActive: true,
      role: { select: { id: true, name: true } }
    }
  }
};

const groupIncludeWithRole = {
  groupLeader: {
    select: { id: true, fullName: true, email: true }
  },
  accounts: {
    select: {
      id: true,
      fullName: true,
      email: true,
      isActive: true,
      role: { select: { id: true, name: true } }
    }
  },
  permissions: {
    include: { permission: true }
  }
};

// Validates account is assigned to at one group (1:1 relationship).
const validateSingleGroupLeadership = async (leaderId, currentGroupId = null) => {
  if (!leaderId) return;

  const existing = await prisma.userGroup.findFirst({
    where: {
      groupLeaderId: Number(leaderId),
      ...(currentGroupId ? { id: { not: Number(currentGroupId) } } : {})
    },
    select: { id: true, name: true }
  });

  if (existing) {
    const err = new Error(`Account is already assigned as leader to group "${existing.name}"`);
    err.status = 400;
    throw err;
  }
};

// ─── List all groups
const getAllGroups = async (user) => {
  const scope = buildGroupScope(user);
  const groups = await prisma.userGroup.findMany({
    where: scope,
    orderBy: { id: 'desc' },
    include: groupInclude
  });

  return groups.map(group => ({ ...group, memberCount: group.accounts.length }));
};

// ─── Get single group by ID
const getGroupById = async (id) => {
  const group = await prisma.userGroup.findUnique({
    where: { id: Number(id) },
    include: groupIncludeWithRole
  });

  if (!group) {
    const err = new Error('Group not found');
    err.status = 404;
    throw err;
  }

  return { ...group, memberCount: group.accounts.length };
};

// ─── Create group
const createGroup = async (name, groupLeaderId, user, permissionIds = []) => {
  if (!name?.trim()) {
    const err = new Error('Group name is required');
    err.status = 400;
    throw err;
  }

  const leaderId = groupLeaderId ? Number(groupLeaderId) : null;

  if (leaderId) {
    // Only administrators or accounts with group.leader.assign can assign a group leader
    const canAssignLeader = user?.roleName === 'admin' || user?.permissions?.has('group.leader.assign');
    if (!canAssignLeader) {
      const err = new Error('Only administrators can assign a Group Leader');
      err.status = 403;
      throw err;
    }

    const leader = await prisma.account.findUnique({ where: { id: leaderId } });
    if (!leader) {
      const err = new Error('Group leader account not found');
      err.status = 404;
      throw err;
    }

    // 1:1 single-group leader constraint
    await validateSingleGroupLeadership(leaderId);
  }

  // Validate permission assignment authority
  if (Array.isArray(permissionIds) && permissionIds.length > 0) {
    const canAssignPerms = user?.roleName === 'admin' || user?.permissions?.has('group.permission.assign');
    if (!canAssignPerms) {
      const err = new Error('Only administrators can configure group permissions');
      err.status = 403;
      throw err;
    }

    // Scope Consistency Rule
    await validatePermissionIdsScopeConsistency(permissionIds);
  }

  return prisma.$transaction(async (tx) => {
    const group = await tx.userGroup.create({
      data: {
        name: name.trim(),
        ...(leaderId && { groupLeader: { connect: { id: leaderId } } }),
        ...(user?.accountId && { createdBy: { connect: { id: user.accountId } } })
      }
    });

    // Link permissions if provided
    if (Array.isArray(permissionIds) && permissionIds.length > 0) {
      await tx.groupPermission.createMany({
        data: permissionIds.map(pid => ({
          groupId: group.id,
          permissionId: Number(pid)
        }))
      });
    }

    return tx.userGroup.findUnique({
      where: { id: group.id },
      include: groupInclude
    });
  });
};

// ─── Update group (name, leader, and/or permissions)
const updateGroup = async (id, { name, groupLeaderId, permissionIds }, user) => {
  const existing = await prisma.userGroup.findUnique({
    where: { id: Number(id) },
    include: { groupLeader: true }
  });

  if (!existing) {
    const err = new Error('Group not found');
    err.status = 404;
    throw err;
  }

  const isAdminOrLeaderAssigner = user?.roleName === 'admin' || user?.permissions?.has('group.leader.assign');
  const isAdminOrPermAssigner = user?.roleName === 'admin' || user?.permissions?.has('group.permission.assign');

  // Leadership modification check
  if (groupLeaderId !== undefined) {
    if (!isAdminOrLeaderAssigner) {
      const err = new Error('Only administrators can assign, change, or remove a Group Leader');
      err.status = 403;
      throw err;
    }

    if (groupLeaderId !== null) {
      const leader = await prisma.account.findUnique({ where: { id: Number(groupLeaderId) } });
      if (!leader) {
        const err = new Error('Group leader account not found');
        err.status = 404;
        throw err;
      }

      // Enforce 1:1 leadership constraint
      await validateSingleGroupLeadership(Number(groupLeaderId), Number(id));
    }
  }

  // Permission modification check
  if (permissionIds !== undefined) {
    if (!isAdminOrPermAssigner) {
      const err = new Error('Only administrators can configure or modify group permissions');
      err.status = 403;
      throw err;
    }

    if (Array.isArray(permissionIds) && permissionIds.length > 0) {
      await validatePermissionIdsScopeConsistency(permissionIds);
    }
  }

  return prisma.$transaction(async (tx) => {
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (groupLeaderId !== undefined) {
      updateData.groupLeader = groupLeaderId
        ? { connect: { id: Number(groupLeaderId) } }
        : { disconnect: true };
    }

    await tx.userGroup.update({
      where: { id: Number(id) },
      data: updateData
    });

    // Replace permission links if provided
    if (Array.isArray(permissionIds)) {
      await tx.groupPermission.deleteMany({ where: { groupId: Number(id) } });
      if (permissionIds.length > 0) {
        await tx.groupPermission.createMany({
          data: permissionIds.map(pid => ({
            groupId: Number(id),
            permissionId: Number(pid)
          }))
        });
      }
    }

    return tx.userGroup.findUnique({
      where: { id: Number(id) },
      include: groupInclude
    });
  });
};

// ─── Delete group
const deleteGroup = async (id, user) => {
  const existing = await prisma.userGroup.findUnique({
    where: { id: Number(id) },
    select: { id: true }
  });

  if (!existing) {
    const err = new Error('Group not found');
    err.status = 404;
    throw err;
  }

  // Only administrators can delete groups
  const isAdmin = user?.roleName === 'admin' || user?.permissions?.has('group.delete');
  if (!isAdmin) {
    const err = new Error('Only administrators can delete groups');
    err.status = 403;
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    // 1. Unassign all members to preserve account records
    await tx.account.updateMany({
      where: { groupId: Number(id) },
      data: { groupId: null }
    });
    // 2. Clear group leader link
    await tx.userGroup.update({
      where: { id: Number(id) },
      data: { groupLeaderId: null }
    });
    // 3. Delete group permission links
    await tx.groupPermission.deleteMany({
      where: { groupId: Number(id) }
    });
    // 4. Delete the group record
    await tx.userGroup.delete({ where: { id: Number(id) } });
  });
};

// ─── Add member to group
const addMemberToGroup = async (groupId, accountId, user) => {
  const group = await prisma.userGroup.findUnique({ where: { id: Number(groupId) } });
  if (!group) {
    const err = new Error('Group not found');
    err.status = 404;
    throw err;
  }

  // Two-tier access check: admin or leader of this group
  const isAuthorized = user?.roleName === 'admin' ||
    user?.permissions?.has('group.read_all') ||
    (group.groupLeaderId && group.groupLeaderId === user?.accountId);

  if (!isAuthorized) {
    const err = new Error('Forbidden: You can only manage members of your designated group');
    err.status = 403;
    throw err;
  }

  const account = await prisma.account.findUnique({ where: { id: Number(accountId) } });
  if (!account) {
    const err = new Error('Account not found');
    err.status = 404;
    throw err;
  }

  if (!account.isActive) {
    const err = new Error('Cannot add deactivated account to group');
    err.status = 400;
    throw err;
  }

  if (account.groupId === Number(groupId)) {
    const err = new Error('Account is already a member of this group');
    err.status = 409;
    throw err;
  }

  return prisma.account.update({
    where: { id: Number(accountId) },
    data: { groupId: Number(groupId) },
    select: {
      id: true,
      fullName: true,
      email: true,
      isActive: true,
      role: { select: { id: true, name: true } },
      group: { select: { id: true, name: true } }
    }
  });
};

// ─── Remove member from group
const removeMemberFromGroup = async (groupId, accountId, user) => {
  const group = await prisma.userGroup.findUnique({ where: { id: Number(groupId) } });
  if (!group) {
    const err = new Error('Group not found');
    err.status = 404;
    throw err;
  }

  // Two-tier access check: admin or leader of this group
  const isAuthorized = user?.roleName === 'admin' ||
    user?.permissions?.has('group.read_all') ||
    (group.groupLeaderId && group.groupLeaderId === user?.accountId);

  if (!isAuthorized) {
    const err = new Error('Forbidden: You can only manage members of your designated group');
    err.status = 403;
    throw err;
  }

  const targetAccountId = Number(accountId);

  // Leader removal guard
  if (group.groupLeaderId === targetAccountId) {
    const err = new Error('Cannot remove member who is the designated group leader; reassign or clear leadership first');
    err.status = 400;
    throw err;
  }

  const account = await prisma.account.findUnique({ where: { id: targetAccountId } });
  if (!account) {
    const err = new Error('Account not found');
    err.status = 404;
    throw err;
  }

  if (account.groupId !== Number(groupId)) {
    const err = new Error('Account is not a member of this group');
    err.status = 400;
    throw err;
  }

  return prisma.account.update({
    where: { id: targetAccountId },
    data: { groupId: null },
    select: {
      id: true,
      fullName: true,
      email: true,
      isActive: true,
      group: { select: { id: true, name: true } }
    }
  });
};

// ─── Query candidate accounts for group leader and member assignment
const getCandidateAccounts = async () => {
  return prisma.account.findMany({
    where: { isActive: true },
    select: {
      id: true,
      fullName: true,
      email: true,
      isActive: true,
      groupId: true,
      role: { select: { id: true, name: true } },
      leadingGroups: { select: { id: true, name: true } }
    },
    orderBy: { fullName: 'asc' }
  });
};

// ─── Query system permissions for group permission configuration
const getGroupPermissions = async () => {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ resource: 'asc' }, { action: 'asc' }]
  });
  const uniqueActions = [...new Set(permissions.map(p => p.action))].sort();
  return { permissions, actions: uniqueActions };
};

module.exports = {
  getAllGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  addMemberToGroup,
  removeMemberFromGroup,
  validateSingleGroupLeadership,
  getCandidateAccounts,
  getGroupPermissions
};


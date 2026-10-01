const prisma = require('../../../config/db');
const { buildGroupScope } = require('../../../authorization/scope/groupScope');

// Shared include shapes
const groupInclude = {
  groupLeader: {
    select: { id: true, fullName: true, email: true }
  },
  accounts: {
    select: { id: true, fullName: true, email: true, isActive: true }
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
const createGroup = async (name, groupLeaderId, user, permissionIds) => {
  if (!name?.trim()) {
    const err = new Error('Group name is required');
    err.status = 400;
    throw err;
  }

  const leaderId = groupLeaderId ? Number(groupLeaderId) : null;

  if (leaderId) {
    const leader = await prisma.account.findUnique({ where: { id: leaderId } });
    if (!leader) {
      const err = new Error('Group leader account not found');
      err.status = 404;
      throw err;
    }
  }

  return prisma.$transaction(async (tx) => {
    const group = await tx.userGroup.create({
      data: {
        name: name.trim(),
        ...(leaderId && { groupLeader: { connect: { id: leaderId } } }),
        ...(user.accountId && { createdBy: { connect: { id: user.accountId } } })
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
const updateGroup = async (id, { name, groupLeaderId, permissionIds }) => {
  const existing = await prisma.userGroup.findUnique({ where: { id: Number(id) } });
  if (!existing) {
    const err = new Error('Group not found');
    err.status = 404;
    throw err;
  }

  if (groupLeaderId !== undefined && groupLeaderId !== null) {
    const leader = await prisma.account.findUnique({ where: { id: Number(groupLeaderId) } });
    if (!leader) {
      const err = new Error('Group leader account not found');
      err.status = 404;
      throw err;
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
const deleteGroup = async (id) => {
  const existing = await prisma.userGroup.findUnique({
    where: { id: Number(id) },
    select: { id: true }
  });

  if (!existing) {
    const err = new Error('Group not found');
    err.status = 404;
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    await tx.account.updateMany({
      where: { groupId: Number(id) },
      data: { groupId: null }
    });
    await tx.userGroup.delete({ where: { id: Number(id) } });
  });
};

// ─── Add member to group
const addMemberToGroup = async (groupId, accountId) => {
  const group = await prisma.userGroup.findUnique({ where: { id: Number(groupId) } });
  if (!group) {
    const err = new Error('Group not found');
    err.status = 404;
    throw err;
  }

  const account = await prisma.account.findUnique({ where: { id: Number(accountId) } });
  if (!account) {
    const err = new Error('Account not found');
    err.status = 404;
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
      group: { select: { id: true, name: true } }
    }
  });
};

// ─── Remove member from group
const removeMemberFromGroup = async (groupId, accountId) => {
  const group = await prisma.userGroup.findUnique({ where: { id: Number(groupId) } });
  if (!group) {
    const err = new Error('Group not found');
    err.status = 404;
    throw err;
  }

  const account = await prisma.account.findUnique({ where: { id: Number(accountId) } });
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
    where: { id: Number(accountId) },
    data: { groupId: null },
    select: {
      id: true,
      fullName: true,
      email: true,
      group: { select: { id: true, name: true } }
    }
  });
};

module.exports = {
  getAllGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  addMemberToGroup,
  removeMemberFromGroup
};


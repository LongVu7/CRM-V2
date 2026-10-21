const prisma = require('../../../config/db');

/**
 * List teams with pagination and optional search
 * @param {object} query - { page, limit, search }
 * @param {object} [permissionScope] - CASL query scope if any
 */
const getAllTeams = async ({ page = 1, limit = 10, search = '' } = {}, permissionScope = {}) => {
  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const limitNumber = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNumber - 1) * limitNumber;

  const where = { ...permissionScope };

  if (search && search.trim()) {
    const searchTerm = search.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } }
    ];
  }

  const [teams, total] = await Promise.all([
    prisma.team.findMany({
      where,
      skip,
      take: limitNumber,
      orderBy: { id: 'desc' },
      include: {
        leader: { select: { id: true, fullName: true, email: true } },
        _count: { select: { members: true } }
      }
    }),
    prisma.team.count({ where })
  ]);

  const data = teams.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    leader: t.leader ? {
      id: t.leader.id,
      fullName: t.leader.fullName,
      email: t.leader.email
    } : null,
    memberCount: t._count.members,
    createdAt: t.createdAt
  }));

  return {
    data,
    pagination: {
      total,
      page: pageNumber,
      limit: limitNumber
    }
  };
};

/**
 * Get team details by ID
 * @param {number|string} id
 * @param {object} [permissionScope]
 */
const getTeamById = async (id, permissionScope = {}) => {
  const where = { id: Number(id), ...permissionScope };

  const team = await prisma.team.findFirst({
    where,
    include: {
      leader: { select: { id: true, fullName: true, email: true } },
      members: {
        include: {
          account: { select: { id: true, fullName: true, email: true } }
        },
        orderBy: { joinedAt: 'asc' }
      },
      permissions: {
        include: { permission: true },
        orderBy: { permissionId: 'asc' }
      }
    }
  });

  if (!team) {
    const error = new Error('Team not found');
    error.statusCode = 404;
    throw error;
  }

  return {
    id: team.id,
    name: team.name,
    description: team.description,
    leader: team.leader ? {
      id: team.leader.id,
      fullName: team.leader.fullName,
      email: team.leader.email
    } : null,
    members: team.members.map(m => ({
      id: m.account.id,
      fullName: m.account.fullName,
      email: m.account.email,
      joinedAt: m.joinedAt
    })),
    permissions: team.permissions.map(tp => ({
      permissionId: tp.permissionId,
      permissionCode: tp.permission.code,
      scope: tp.scope
    })),
    createdAt: team.createdAt
  };
};

/**
 * Create a new team
 * @param {object} data - { name, description, leaderId }
 * @param {number|string} [creatorId]
 */
const createTeam = async (data, creatorId) => {
  const existing = await prisma.team.findUnique({ where: { name: data.name.trim() } });
  if (existing) {
    const error = new Error('Team with this name already exists');
    error.statusCode = 409;
    throw error;
  }

  if (data.leaderId) {
    const leader = await prisma.account.findUnique({ where: { id: Number(data.leaderId) } });
    if (!leader) {
      const error = new Error('Leader account not found');
      error.statusCode = 404;
      throw error;
    }
  }

  const newTeam = await prisma.$transaction(async (tx) => {
    const created = await tx.team.create({
      data: {
        name: data.name.trim(),
        description: data.description || null,
        ...(data.leaderId ? { leader: { connect: { id: Number(data.leaderId) } } } : {}),
        ...(creatorId ? { createdBy: { connect: { id: Number(creatorId) } } } : {})
      }
    });

    if (data.leaderId) {
      await tx.teamMember.create({
        data: {
          teamId: created.id,
          accountId: Number(data.leaderId)
        }
      });
    }

    return created;
  });

  return {
    id: newTeam.id,
    name: newTeam.name,
    description: newTeam.description,
    leaderId: newTeam.leaderId,
    createdAt: newTeam.createdAt
  };
};

/**
 * Update an existing team
 * @param {number|string} id
 * @param {object} data - { name, description, leaderId }
 */
const updateTeam = async (id, data) => {
  const team = await prisma.team.findUnique({ where: { id: Number(id) } });
  if (!team) {
    const error = new Error('Team not found');
    error.statusCode = 404;
    throw error;
  }

  if (data.name && data.name.trim() !== team.name) {
    const duplicate = await prisma.team.findUnique({ where: { name: data.name.trim() } });
    if (duplicate) {
      const error = new Error('Team with this name already exists');
      error.statusCode = 409;
      throw error;
    }
  }

  if (data.leaderId) {
    const leader = await prisma.account.findUnique({ where: { id: Number(data.leaderId) } });
    if (!leader) {
      const error = new Error('Leader account not found');
      error.statusCode = 404;
      throw error;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.team.update({
      where: { id: Number(id) },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.leaderId !== undefined ? { leaderId: data.leaderId ? Number(data.leaderId) : null } : {})
      }
    });

    if (data.leaderId) {
      await tx.teamMember.upsert({
        where: { teamId_accountId: { teamId: Number(id), accountId: Number(data.leaderId) } },
        create: { teamId: Number(id), accountId: Number(data.leaderId) },
        update: {}
      });
    }

    return res;
  });

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    leaderId: updated.leaderId
  };
};

/**
 * Delete a team
 * @param {number|string} id
 */
const deleteTeam = async (id) => {
  const team = await prisma.team.findUnique({ where: { id: Number(id) } });
  if (!team) {
    const error = new Error('Team not found');
    error.statusCode = 404;
    throw error;
  }

  await prisma.team.delete({ where: { id: Number(id) } });
  return { success: true };
};

/**
 * Add a member account to a team
 * @param {number|string} teamId
 * @param {number|string} accountId
 */
const addMember = async (teamId, accountId) => {
  const team = await prisma.team.findUnique({ where: { id: Number(teamId) } });
  if (!team) {
    const error = new Error('Team not found');
    error.statusCode = 404;
    throw error;
  }

  const account = await prisma.account.findUnique({ where: { id: Number(accountId) } });
  if (!account) {
    const error = new Error('Account not found');
    error.statusCode = 404;
    throw error;
  }

  const member = await prisma.teamMember.upsert({
    where: { teamId_accountId: { teamId: Number(teamId), accountId: Number(accountId) } },
    create: { teamId: Number(teamId), accountId: Number(accountId) },
    update: {}
  });

  return {
    teamId: member.teamId,
    accountId: member.accountId,
    joinedAt: member.joinedAt
  };
};

/**
 * Remove a member account from a team
 * @param {number|string} teamId
 * @param {number|string} accountId
 */
const removeMember = async (teamId, accountId) => {
  const member = await prisma.teamMember.findUnique({
    where: { teamId_accountId: { teamId: Number(teamId), accountId: Number(accountId) } }
  });

  if (!member) {
    const error = new Error('Member not found in team');
    error.statusCode = 404;
    throw error;
  }

  await prisma.teamMember.delete({
    where: { teamId_accountId: { teamId: Number(teamId), accountId: Number(accountId) } }
  });

  return { success: true };
};

/**
 * Update team permissions with dynamic scopes
 * Enforces that non-administrators cannot assign scope = 'ALL'
 * @param {number|string} teamId
 * @param {Array<{permissionId: number, scope: string}>} permissions
 * @param {object} user - Authenticated user context
 */
const updateTeamPermissions = async (teamId, permissions, user) => {
  const isAdmin = user && (user.roleName === 'Administrator' || user.roleName === 'admin' || user.role?.name === 'Administrator');
  if (!isAdmin && permissions.some(p => p.scope === 'ALL')) {
    const error = new Error("Only administrators can assign 'ALL' scope to team permissions");
    error.statusCode = 403;
    throw error;
  }

  const team = await prisma.team.findUnique({ where: { id: Number(teamId) } });
  if (!team) {
    const error = new Error('Team not found');
    error.statusCode = 404;
    throw error;
  }

  const permIds = permissions.map(p => Number(p.permissionId));
  if (permIds.length > 0) {
    const existingPerms = await prisma.permission.findMany({
      where: { id: { in: permIds } },
      select: { id: true }
    });

    if (existingPerms.length !== permIds.length) {
      const foundIds = new Set(existingPerms.map(p => p.id));
      const missingIds = permIds.filter(id => !foundIds.has(id));
      const error = new Error(`Invalid permission IDs: ${missingIds.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.teamPermission.deleteMany({ where: { teamId: Number(teamId) } });
    if (permissions.length > 0) {
      await tx.teamPermission.createMany({
        data: permissions.map(p => ({
          teamId: Number(teamId),
          permissionId: Number(p.permissionId),
          scope: p.scope || 'TEAM_ONLY'
        }))
      });
    }
  });

  return {
    teamId: Number(teamId),
    permissionsAssigned: permissions.length
  };
};

module.exports = {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
  updateTeamPermissions
};

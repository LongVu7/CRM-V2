const prisma = require('../../../config/db');
const {
  validateNoCircularHierarchy,
  buildTeamTree,
  getDescendantSubtreeTeamIds
} = require('../../utils/teamHierarchy');

/**
 * List teams with pagination and optional search
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
        parent: {
          select: { id: true, name: true }
        },
        leader: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: { select: { id: true, name: true } }
          }
        },
        _count: { select: { members: true, children: true } }
      }
    }),
    prisma.team.count({ where })
  ]);

  const data = teams.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    parentId: t.parentId,
    parent: t.parent ? { id: t.parent.id, name: t.parent.name } : null,
    leader: t.leader ? {
      id: t.leader.id,
      fullName: t.leader.fullName,
      email: t.leader.email,
      role: t.leader.role
    } : null,
    memberCount: t._count.members,
    childrenCount: t._count.children,
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
 * Get entire hierarchical team tree
 */
const getTeamTree = async (permissionScope = {}) => {
  const teams = await prisma.team.findMany({
    where: permissionScope,
    orderBy: { name: 'asc' },
    include: {
      leader: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: { select: { id: true, name: true } }
        }
      },
      _count: { select: { members: true } }
    }
  });

  const formattedTeams = teams.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    parentId: t.parentId,
    leaderId: t.leaderId,
    leader: t.leader,
    memberCount: t._count.members,
    createdAt: t.createdAt
  }));

  return buildTeamTree(formattedTeams);
};

/**
 * Get team details by ID
 */
const getTeamById = async (id, permissionScope = {}) => {
  const where = { id: Number(id), ...permissionScope };

  const team = await prisma.team.findFirst({
    where,
    include: {
      parent: {
        select: { id: true, name: true }
      },
      children: {
        select: {
          id: true,
          name: true,
          leader: { select: { id: true, fullName: true } }
        }
      },
      leader: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: { select: { id: true, name: true } }
        }
      },
      members: {
        include: {
          account: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: { select: { id: true, name: true } }
            }
          },
          role: { select: { id: true, name: true } }
        },
        orderBy: { joinedAt: 'asc' }
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
    parentId: team.parentId,
    parent: team.parent ? { id: team.parent.id, name: team.parent.name } : null,
    children: team.children,
    leader: team.leader ? {
      id: team.leader.id,
      fullName: team.leader.fullName,
      email: team.leader.email,
      role: team.leader.role
    } : null,
    members: team.members.map(m => ({
      id: m.account.id,
      fullName: m.account.fullName,
      email: m.account.email,
      accountRole: m.account.role,
      roleId: m.roleId,
      teamRole: m.role ? { id: m.role.id, name: m.role.name } : null,
      joinedAt: m.joinedAt
    })),
    createdAt: team.createdAt
  };
};

/**
 * Create a new team
 */
const createTeam = async (data, creatorId) => {
  const existing = await prisma.team.findUnique({ where: { name: data.name.trim() } });
  if (existing) {
    const error = new Error('Team with this name already exists');
    error.statusCode = 409;
    throw error;
  }

  if (data.parentId) {
    const parent = await prisma.team.findUnique({ where: { id: Number(data.parentId) } });
    if (!parent) {
      const error = new Error('Parent team not found');
      error.statusCode = 404;
      throw error;
    }
    try {
      await validateNoCircularHierarchy(null, Number(data.parentId));
    } catch (err) {
      err.statusCode = 400;
      throw err;
    }
  }

  if (data.leaderId) {
    const leader = await prisma.account.findUnique({ where: { id: Number(data.leaderId) } });
    if (!leader) {
      const error = new Error('Leader account not found');
      error.statusCode = 404;
      throw error;
    }
    if (!leader.isActive) {
      const error = new Error('Cannot appoint a deactivated account as team leader');
      error.statusCode = 400;
      throw error;
    }
  }

  return prisma.team.create({
    data: {
      name: data.name.trim(),
      description: data.description || null,
      ...(data.parentId ? { parent: { connect: { id: Number(data.parentId) } } } : {}),
      ...(data.leaderId ? { leader: { connect: { id: Number(data.leaderId) } } } : {}),
      ...(creatorId ? { createdBy: { connect: { id: Number(creatorId) } } } : {})
    },
    include: {
      parent: { select: { id: true, name: true } },
      leader: { select: { id: true, fullName: true, email: true } }
    }
  });
};

/**
 * Update team details
 */
const updateTeam = async (id, data) => {
  const teamId = Number(id);
  const existing = await prisma.team.findUnique({ where: { id: teamId } });
  if (!existing) {
    const error = new Error('Team not found');
    error.statusCode = 404;
    throw error;
  }

  if (data.name && data.name.trim() !== existing.name) {
    const duplicate = await prisma.team.findUnique({ where: { name: data.name.trim() } });
    if (duplicate) {
      const error = new Error('Team with this name already exists');
      error.statusCode = 409;
      throw error;
    }
  }

  if (data.parentId !== undefined) {
    if (data.parentId !== null) {
      const parent = await prisma.team.findUnique({ where: { id: Number(data.parentId) } });
      if (!parent) {
        const error = new Error('Parent team not found');
        error.statusCode = 404;
        throw error;
      }
      try {
        await validateNoCircularHierarchy(teamId, Number(data.parentId));
      } catch (err) {
        err.statusCode = 400;
        throw err;
      }
    }
  }

  if (data.leaderId) {
    const leader = await prisma.account.findUnique({ where: { id: Number(data.leaderId) } });
    if (!leader) {
      const error = new Error('Leader account not found');
      error.statusCode = 404;
      throw error;
    }
    if (!leader.isActive) {
      const error = new Error('Cannot appoint a deactivated account as team leader');
      error.statusCode = 400;
      throw error;
    }
  }

  return prisma.team.update({
    where: { id: teamId },
    data: {
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.parentId !== undefined
        ? (data.parentId === null ? { parent: { disconnect: true } } : { parent: { connect: { id: Number(data.parentId) } } })
        : {}),
      ...(data.leaderId !== undefined
        ? (data.leaderId === null ? { leader: { disconnect: true } } : { leader: { connect: { id: Number(data.leaderId) } } })
        : {})
    },
    include: {
      parent: { select: { id: true, name: true } },
      leader: { select: { id: true, fullName: true, email: true } }
    }
  });
};

/**
 * Delete a team
 */
const deleteTeam = async (id) => {
  const teamId = Number(id);
  const existing = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      _count: { select: { inquiries: true, campaigns: true, children: true } }
    }
  });

  if (!existing) {
    const error = new Error('Team not found');
    error.statusCode = 404;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    // If the team has child teams, detach them to root (parentId = null)
    if (existing._count.children > 0) {
      await tx.team.updateMany({
        where: { parentId: teamId },
        data: { parentId: null }
      });
    }

    // Reassign inquiries and campaigns to null team
    if (existing._count.inquiries > 0) {
      await tx.inquiry.updateMany({
        where: { teamId },
        data: { teamId: null }
      });
    }

    if (existing._count.campaigns > 0) {
      await tx.campaign.updateMany({
        where: { teamId },
        data: { teamId: null }
      });
    }

    await tx.team.delete({ where: { id: teamId } });
    return { success: true, message: 'Team decommissioned successfully' };
  });
};

/**
 * Add or transfer a member to a team with a contextual role
 * User can be a member of single teams
 * Enforces Single-Team Membership (1:1) via upsert on accountId
 */
const addMember = async (teamId, data) => {
  const tid = Number(teamId);
  const aid = Number(data.accountId);
  const rid = data.roleId ? Number(data.roleId) : null;

  const team = await prisma.team.findUnique({ where: { id: tid } });
  if (!team) {
    const error = new Error('Team not found');
    error.statusCode = 404;
    throw error;
  }

  const account = await prisma.account.findUnique({ where: { id: aid } });
  if (!account) {
    const error = new Error('Account not found');
    error.statusCode = 404;
    throw error;
  }

  if (rid) {
    const role = await prisma.role.findUnique({ where: { id: rid } });
    if (!role) {
      const error = new Error('Role not found');
      error.statusCode = 404;
      throw error;
    }
  }

  // User can be a member of single teams
  // Upsert by accountId transfers user if already in another team
  const member = await prisma.teamMember.upsert({
    where: { accountId: aid },
    update: {
      teamId: tid,
      roleId: rid,
      joinedAt: new Date()
    },
    create: {
      teamId: tid,
      accountId: aid,
      roleId: rid
    },
    include: {
      account: { select: { id: true, fullName: true, email: true } },
      role: { select: { id: true, name: true } }
    }
  });

  return {
    teamId: member.teamId,
    accountId: member.accountId,
    roleId: member.roleId,
    account: member.account,
    role: member.role,
    joinedAt: member.joinedAt
  };
};

/**
 * Remove member from team
 */
const removeMember = async (teamId, accountId) => {
  const tid = Number(teamId);
  const aid = Number(accountId);

  const existing = await prisma.teamMember.findUnique({
    where: { accountId: aid }
  });

  if (!existing || existing.teamId !== tid) {
    const error = new Error('Member not found in this team');
    error.statusCode = 404;
    throw error;
  }

  await prisma.teamMember.delete({
    where: { accountId: aid }
  });

  return { success: true, message: 'Member removed successfully' };
};

/**
 * Get active accounts available for team assignment (member addition and leadership)
 */
const getAvailableAccounts = async () => {
  return prisma.account.findMany({
    where: { isActive: true },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: { select: { id: true, name: true } },
      teamMemberships: {
        select: {
          teamId: true,
          team: { select: { id: true, name: true } },
          role: { select: { id: true, name: true } }
        }
      },
      isActive: true
    },
    orderBy: { fullName: 'asc' }
  });
};

/**
 * Get valid parent team candidates for team create or update.
 * If `excludeTeamId` is provided (e.g. during edit), excludes that team and all its descendant subtrees.
 */
const getParentTeamOptions = async (excludeTeamId = null) => {
  let excludedIds = [];
  if (excludeTeamId) {
    const tid = Number(excludeTeamId);
    if (!isNaN(tid) && tid > 0) {
      excludedIds = await getDescendantSubtreeTeamIds(tid);
    }
  }

  return prisma.team.findMany({
    where: {
      ...(excludedIds.length > 0 ? { id: { notIn: excludedIds } } : {})
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });
};

module.exports = {
  getAllTeams,
  getTeamTree,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
  getAvailableAccounts,
  getParentTeamOptions
};

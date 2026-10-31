const crypto = require('crypto');
const prisma = require('../../../config/db');
const { calculateRoundRobin, summarizeAllocations } = require('../../utils/roundRobin');
const {
  SLA_TIERS,
  calculateElapsedMinutes,
  classifySlaTier,
  tierToCreatedAtRange
} = require('../../utils/slaTier');

const createServiceError = (message, statusCode = 400, reason = null, details = null) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.status = statusCode;
  if (reason) err.reason = reason;
  if (details) err.details = details;
  return err;
};

/**
 * Resolves the effective distribution scope for the authenticated user.
 * Admin -> ALL
 * Role permission priority: ALL > TEAM_ONLY > OWNER_ONLY
 */
const resolveDistributionScope = (user) => {
  const roleName = (user?.roleName || '').toLowerCase();
  if (roleName === 'admin' || roleName === 'administrator') {
    return {
      effectiveScope: 'ALL',
      authorizedTeamIds: user?.authorizedTeamIds || [],
      authorizedAccountIds: user?.authorizedAccountIds || []
    };
  }

  const permissions = Array.isArray(user?.rolePermissions) ? user.rolePermissions : [];
  const distributePerms = permissions.filter(p =>
    (p?.resource?.toLowerCase() === 'lead' || p?.resource?.toLowerCase() === 'inquiry') &&
    p?.action?.toLowerCase() === 'distribute'
  );

  let effectiveScope = 'OWNER_ONLY';
  if (distributePerms.some(p => (p.scope || '').toUpperCase() === 'ALL')) {
    effectiveScope = 'ALL';
  } else if (distributePerms.some(p => (p.scope || '').toUpperCase() === 'TEAM_ONLY')) {
    effectiveScope = 'TEAM_ONLY';
  } else if (distributePerms.some(p => (p.scope || '').toUpperCase() === 'OWNER_ONLY')) {
    effectiveScope = 'OWNER_ONLY';
  }

  return {
    effectiveScope,
    authorizedTeamIds: user?.authorizedTeamIds || [],
    authorizedAccountIds: user?.authorizedAccountIds || []
  };
};

/**
 * Extracts and formats 3-level source hierarchy.
 */
const formatSourceHierarchy = (sourceData) => {
  if (!sourceData) {
    return {
      sourceId: null,
      source: null,
      sourceDetail: null,
      approachMethod: null
    };
  }

  const level = sourceData.level;
  if (level === 'approachMethod' || level === 'approach_method') {
    const parent = sourceData.parent;
    const grandparent = parent?.parent;
    return {
      sourceId: grandparent?.id || parent?.id || sourceData.id,
      source: grandparent?.label || grandparent?.name || parent?.label || parent?.name || null,
      sourceDetail: parent?.label || parent?.name || null,
      approachMethod: sourceData.label || sourceData.name
    };
  }

  if (level === 'sourceDetail' || level === 'source_detail') {
    const parent = sourceData.parent;
    return {
      sourceId: parent?.id || sourceData.id,
      source: parent?.label || parent?.name || null,
      sourceDetail: sourceData.label || sourceData.name,
      approachMethod: null
    };
  }

  return {
    sourceId: sourceData.id,
    source: sourceData.label || sourceData.name,
    sourceDetail: null,
    approachMethod: null
  };
};

/**
 * Query unassigned pool with pagination, search, source filtering, and SLA tier indicators.
 */
const getUnassignedPool = async (query) => {
  const {
    page = 1,
    limit = 20,
    search,
    sourceId,
    slaTier,
    sortField = 'createdAt',
    sortOrder = -1
  } = query;

  const now = new Date();
  const skip = (page - 1) * limit;

  // Build WHERE conditions
  const andClauses = [{ assignedToId: null }];

  if (search && search.trim().length > 0) {
    const term = search.trim();
    andClauses.push({
      OR: [
        { description: { contains: term, mode: 'insensitive' } },
        { student: { fullName: { contains: term, mode: 'insensitive' } } },
        { student: { mobile: { contains: term, mode: 'insensitive' } } },
        { student: { otherPhone: { contains: term, mode: 'insensitive' } } },
        { student: { email: { contains: term, mode: 'insensitive' } } }
      ]
    });
  }

  if (sourceId) {
    const parsedSourceId = parseInt(sourceId, 10);
    andClauses.push({
      OR: [
        { sourceDataId: parsedSourceId },
        { sourceData: { parentId: parsedSourceId } },
        { sourceData: { parent: { parentId: parsedSourceId } } }
      ]
    });
  }

  if (slaTier && SLA_TIERS[slaTier]) {
    const range = tierToCreatedAtRange(slaTier, now);
    andClauses.push({ createdAt: range });
  }

  const where = andClauses.length === 1 ? andClauses[0] : { AND: andClauses };

  // Determine sorting
  let orderBy = { createdAt: sortOrder === 1 ? 'asc' : 'desc' };
  if (sortField === 'student.fullName') {
    orderBy = { student: { fullName: sortOrder === 1 ? 'asc' : 'desc' } };
  }

  // Parallel queries: paginated data, total count, and single-pass SLA tier summary
  const [inquiries, totalCount, summaryRaw] =
    await prisma.$transaction([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          description: true,
          createdAt: true,
          student: {
            select: {
              id: true,
              fullName: true,
              mobile: true,
              email: true
            }
          },
          sourceData: {
            select: {
              id: true,
              name: true,
              label: true,
              level: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  label: true,
                  level: true,
                  parent: {
                    select: {
                      id: true,
                      name: true,
                      label: true,
                      level: true
                    }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.lead.count({ where }),
      prisma.$queryRaw`
        SELECT
          COUNT(*) FILTER (WHERE created_at >= ${now}::timestamptz - INTERVAL '24 hours') AS normal,
          COUNT(*) FILTER (WHERE created_at < ${now}::timestamptz - INTERVAL '24 hours' AND created_at >= ${now}::timestamptz - INTERVAL '48 hours') AS attention,
          COUNT(*) FILTER (WHERE created_at < ${now}::timestamptz - INTERVAL '48 hours' AND created_at >= ${now}::timestamptz - INTERVAL '72 hours') AS warning,
          COUNT(*) FILTER (WHERE created_at < ${now}::timestamptz - INTERVAL '72 hours') AS overdue
        FROM lead
        WHERE assigned_to_id IS NULL
      `
    ]);

  const summaryRow = summaryRaw[0] || {};

  const data = inquiries.map(inq => {
    const elapsedMinutes = calculateElapsedMinutes(inq.createdAt, now);
    const tier = classifySlaTier(elapsedMinutes);
    const sourceInfo = formatSourceHierarchy(inq.sourceData);

    return {
      id: inq.id,
      student: inq.student || null,
      description: inq.description,
      sourceId: sourceInfo.sourceId,
      source: sourceInfo.source,
      sourceDetail: sourceInfo.sourceDetail,
      approachMethod: sourceInfo.approachMethod,
      createdAt: inq.createdAt.toISOString(),
      elapsedMinutes,
      slaTier: tier
    };
  });

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return {
    data,
    pagination: {
      totalCount,
      totalPages,
      currentPage: page,
      limit
    },
    summary: {
      NORMAL: Number(summaryRow.normal || 0),
      ATTENTION: Number(summaryRow.attention || 0),
      WARNING: Number(summaryRow.warning || 0),
      OVERDUE: Number(summaryRow.overdue || 0)
    }
  };
};

/**
 * Returns eligible distribution scopes based on requester's permissions.
 */
const getDistributionScopes = async (user) => {
  const { effectiveScope, authorizedTeamIds } = resolveDistributionScope(user);

  if (effectiveScope === 'OWNER_ONLY') {
    return {
      effectiveScope,
      data: [
        { type: 'SELF', name: 'Myself', memberCount: 1 }
      ]
    };
  }

  const teamWhere = effectiveScope === 'TEAM_ONLY'
    ? { id: { in: authorizedTeamIds } }
    : {};

  const [teams, allActiveCount, independentActiveCount] = await Promise.all([
    prisma.team.findMany({
      where: teamWhere,
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            members: {
              where: { account: { isActive: true } }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    }),
    effectiveScope === 'ALL'
      ? prisma.account.count({ where: { isActive: true } })
      : Promise.resolve(0),
    effectiveScope === 'ALL'
      ? prisma.account.count({
          where: {
            isActive: true,
            teamMemberships: { none: {} }
          }
        })
      : Promise.resolve(0)
  ]);

  const scopes = [];

  if (effectiveScope === 'ALL') {
    scopes.push({
      type: 'ALL',
      name: 'All Staff',
      memberCount: allActiveCount
    });
  }

  for (const t of teams) {
    scopes.push({
      type: 'TEAM',
      teamId: t.id,
      name: t.name,
      memberCount: t._count?.members || 0
    });
  }

  if (effectiveScope === 'ALL') {
    scopes.push({
      type: 'NO_TEAM',
      name: 'Independent Staff',
      memberCount: independentActiveCount
    });
  }

  return {
    effectiveScope,
    data: scopes
  };
};

/**
 * Returns eligible recipient staff accounts and their active workload.
 */
const getScopeRecipients = async (query, user) => {
  const { scope, teamId } = query;
  const { effectiveScope, authorizedTeamIds } = resolveDistributionScope(user);

  // Validate scope permission
  if (effectiveScope === 'OWNER_ONLY' && scope !== 'SELF') {
    throw createServiceError(
      'Your permissions restrict distribution to yourself only',
      403,
      'SCOPE_NOT_ALLOWED'
    );
  }

  if (effectiveScope === 'TEAM_ONLY') {
    if (scope === 'ALL' || scope === 'NO_TEAM') {
      throw createServiceError(
        'Team managers may only distribute to their authorized teams',
        403,
        'SCOPE_NOT_ALLOWED'
      );
    }
    if (scope === 'TEAM') {
      const tid = parseInt(teamId, 10);
      if (!authorizedTeamIds.includes(tid)) {
        throw createServiceError(
          'You are not authorized to distribute to this team',
          403,
          'SCOPE_NOT_ALLOWED'
        );
      }
    }
  }

  let accountWhere = { isActive: true };

  if (scope === 'SELF') {
    const userId = user?.id || user?.accountId;
    accountWhere = { id: userId, isActive: true };
  } else if (scope === 'TEAM') {
    const tid = parseInt(teamId, 10);
    const team = await prisma.team.findUnique({ where: { id: tid } });
    if (!team) {
      throw createServiceError('Team not found', 404, 'TEAM_NOT_FOUND');
    }
    accountWhere = {
      isActive: true,
      teamMemberships: { some: { teamId: tid } }
    };
  } else if (scope === 'NO_TEAM') {
    accountWhere = {
      isActive: true,
      teamMemberships: { none: {} }
    };
  }

  const accounts = await prisma.account.findMany({
    where: accountWhere,
    select: {
      id: true,
      fullName: true,
      email: true,
      role: { select: { id: true, name: true } },
      teamMemberships: {
        take: 1,
        select: {
          teamId: true,
          team: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { fullName: 'asc' }
  });

  const accountIds = accounts.map(a => a.id);

  // Compute active workload: count inquiries currently assigned (excluding terminal/closed statuses)
  const workloadGroups = accountIds.length > 0
    ? await prisma.lead.groupBy({
        by: ['assignedToId'],
        where: {
          assignedToId: { in: accountIds },
          NOT: {
            statusData: {
              name: { in: ['payment_completed_nb', 'cancelled'] }
            }
          }
        },
        _count: { id: true }
      })
    : [];

  const workloadMap = new Map();
  workloadGroups.forEach(w => {
    if (w.assignedToId) {
      workloadMap.set(w.assignedToId, w._count.id);
    }
  });

  const data = accounts.map(acc => {
    const membership = acc.teamMemberships?.[0];
    return {
      id: acc.id,
      fullName: acc.fullName,
      email: acc.email,
      roleName: acc.role?.name || null,
      teamId: membership?.teamId || null,
      teamName: membership?.team?.name || null,
      activeInquiriesCount: workloadMap.get(acc.id) || 0
    };
  });

  return { data };
};

/**
 * Validates that all recipient staffIds exist, are active, and authorized.
 */
const validateRecipients = async (staffIds, user) => {
  const { effectiveScope, authorizedAccountIds } = resolveDistributionScope(user);
  const userId = user?.id || user?.accountId;

  const staff = await prisma.account.findMany({
    where: { id: { in: staffIds }, isActive: true },
    select: {
      id: true,
      fullName: true,
      email: true
    }
  });

  const staffMap = new Map(staff.map(s => [s.id, s]));
  const invalidStaffIds = staffIds.filter(sid => {
    if (!staffMap.has(sid)) return true;
    if (effectiveScope === 'OWNER_ONLY' && sid !== userId) return true;
    if (effectiveScope === 'TEAM_ONLY' && !authorizedAccountIds.includes(sid)) return true;
    return false;
  });

  if (invalidStaffIds.length > 0) {
    throw createServiceError(
      `Invalid or unauthorized recipient staff: ${invalidStaffIds.join(', ')}`,
      422,
      'INVALID_RECIPIENTS',
      { invalidStaffIds }
    );
  }

  // Return staff objects preserving requested staffIds order
  return staffIds.map(sid => staffMap.get(sid));
};

/**
 * Preview dry-run Round-Robin lead distribution.
 */
const previewDistribution = async (payload, user) => {
  const leadIds = payload.leadIds || payload.inquiryIds || []; const { staffIds = [] } = payload; const inquiryIds = leadIds;

  const staffList = await validateRecipients(staffIds, user);

  // Check which inquiries are actually unassigned, sorted matching execution order
  const existingInquiries = await prisma.lead.findMany({
    where: { id: { in: inquiryIds } },
    select: { id: true, createdAt: true, assignedToId: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
  });

  const existingMap = new Map(existingInquiries.map(i => [i.id, i]));
  const skipped = [];

  for (const id of inquiryIds) {
    const inq = existingMap.get(id);
    if (!inq) {
      skipped.push({ leadId: id, inquiryId: id, reason: 'NOT_FOUND' });
    } else if (inq.assignedToId !== null) {
      skipped.push({ leadId: id, inquiryId: id, reason: 'ALREADY_ASSIGNED' });
    }
  }

  const distributableIds = existingInquiries
    .filter(i => i.assignedToId === null)
    .map(i => i.id);

  const summary = summarizeAllocations(distributableIds, staffList);

  return {
    totalRequested: inquiryIds.length,
    distributable: distributableIds.length,
    recipientCount: staffIds.length,
    averagePerStaff: summary.averagePerStaff,
    allocations: summary.allocations,
    skipped
  };
};

/**
 * Execute atomic lead distribution in a single database transaction.
 */
const distributeLeads = async (payload, user) => {
  const leadIds = payload.leadIds || payload.inquiryIds || []; const inquiryIds = leadIds; const { staffIds = [], teamId, method = 'ROUND_ROBIN' } = payload;
  const userId = user?.id || user?.accountId || null;

  // 1. Validate recipients upfront
  const staffList = await validateRecipients(staffIds, user);

  // 2. Transaction with row locks (FOR UPDATE SKIP LOCKED)
  const result = await prisma.$transaction(async (tx) => {
    // Acquire row locks on unassigned leads
    const lockedRows = await tx.$queryRaw`
      SELECT id, created_at, assigned_to_id
      FROM lead
      WHERE id = ANY(${inquiryIds}::int[])
        AND assigned_to_id IS NULL
      ORDER BY created_at ASC, id ASC
      FOR UPDATE SKIP LOCKED
    `;

    const lockedMap = new Map(lockedRows.map(r => [r.id, r]));
    const lockedIds = lockedRows.map(r => r.id);

    // Identify skipped leads
    const skipped = [];
    if (lockedIds.length < inquiryIds.length) {
      const allRows = await tx.lead.findMany({
        where: { id: { in: inquiryIds } },
        select: { id: true, assignedToId: true }
      });
      const allRowsMap = new Map(allRows.map(r => [r.id, r]));

      for (const id of inquiryIds) {
        if (!lockedMap.has(id)) {
          const row = allRowsMap.get(id);
          if (!row) {
            skipped.push({ leadId: id, inquiryId: id, reason: 'NOT_FOUND' });
          } else if (row.assignedToId !== null) {
            skipped.push({ leadId: id, inquiryId: id, reason: 'ALREADY_ASSIGNED' });
          } else {
            skipped.push({ leadId: id, inquiryId: id, reason: 'LOCKED' });
          }
        }
      }
    }

    if (lockedIds.length === 0) {
      throw createServiceError(
        'All requested inquiries were already assigned or locked by another operation',
        409,
        'ALL_INQUIRIES_CONFLICTED',
        { skipped }
      );
    }

    // 3. Compute Round-Robin rotation
    const rotation = calculateRoundRobin(lockedIds, staffIds);
    const batchId = crypto.randomUUID();

    // 4. Grouped updateMany per staffId
    const recipientToInquiryIds = new Map();
    for (const item of rotation) {
      if (!recipientToInquiryIds.has(item.assignedToId)) {
        recipientToInquiryIds.set(item.assignedToId, []);
      }
      recipientToInquiryIds.get(item.assignedToId).push(item.inquiryId);
    }

    for (const [staffId, assignedIds] of recipientToInquiryIds.entries()) {
      await tx.lead.updateMany({
        where: { id: { in: assignedIds } },
        data: { assignedToId: staffId }
      });
    }

    // 5. Create immutable audit log records
    const now = new Date();
    const logData = rotation.map(item => ({
      leadId: item.leadId || item.inquiryId, inquiryId: item.leadId || item.inquiryId,
      previousAssigneeId: null,
      newAssigneeId: item.assignedToId,
      assignedById: userId,
      batchId,
      method,
      scopeTeamId: teamId || null,
      orderRank: item.orderRank,
      assignedAt: now
    }));

    await tx.leadAssignmentLog.createMany({
      data: logData
    });

    const summary = summarizeAllocations(lockedIds, staffList);

    return {
      batchId,
      totalRequested: inquiryIds.length,
      totalDistributed: lockedIds.length,
      recipientCount: staffIds.length,
      allocations: summary.allocations,
      skipped
    };
  }, {
    isolationLevel: 'ReadCommitted',
    timeout: 15000
  });

  return result;
};

module.exports = {
  createServiceError,
  getUnassignedPool,
  getDistributionScopes,
  getScopeRecipients,
  previewDistribution,
  distributeLeads
};

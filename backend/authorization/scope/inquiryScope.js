const prisma = require('../../config/db');

// Helper to get managed group member's account IDs for a group leader only
const getManagedGroupMemberIds = async (accountId) => {
  if (!accountId) return [];
  const groups = await prisma.userGroup.findMany({
    where: { groupLeaderId: Number(accountId) },
    select: {
      accounts: { select: { id: true } }
    }
  });

  const memberIds = groups.flatMap(g => g.accounts.map(a => a.id));
  return [...new Set(memberIds)];
};

// ─── Build Prisma WHERE scope for inquiry read queries
const buildInquiryReadScope = async (user) => {
  if (user?.roleName === 'admin' || user?.permissions?.has('inquiry.read_all')) {
    return {};
  }

  // get list of user's account ID and their group leader's account ID
  const validIds = [];

  if (user?.permissions?.has('inquiry.read_assigned') && user?.accountId) {
    validIds.push(user.accountId);
  }

  if (user?.permissions?.has('inquiry.read_group') && user?.accountId) {
    // if (!validIds.includes(user.accountId))
    //    validIds.push(user.accountId);
    const memberIds = await getManagedGroupMemberIds(user.accountId);
    validIds.push(...memberIds);
  }

  const uniqueIds = [...new Set(validIds)];

  // Allow triage staff with assign or import capability to see unassigned leads
  if (user?.permissions?.has('inquiry.assign') || user?.permissions?.has('inquiry.import')) {
    return {
      OR: [
        ...(uniqueIds.length > 0 ? [{ assignedToId: { in: uniqueIds } }] : []),
        { assignedToId: null }
      ]
    };
  }

  if (uniqueIds.length === 0) {
    return { id: -1 };
  }

  return { assignedToId: { in: uniqueIds } };
};

// ─── Build Prisma WHERE scope for inquiry update queries
const buildInquiryUpdateScope = async (user) => {
  if (user?.roleName === 'admin' || user?.permissions?.has('inquiry.update_all')) {
    return {};
  }

  const validIds = [];

  if (user?.permissions?.has('inquiry.update_assigned') && user?.accountId) {
    validIds.push(user.accountId);
  }

  if (user?.permissions?.has('inquiry.update_group') && user?.accountId) {
    // if (!validIds.includes(user.accountId)) 
    //   validIds.push(user.accountId);
    const memberIds = await getManagedGroupMemberIds(user.accountId);
    validIds.push(...memberIds);
  }

  const uniqueIds = [...new Set(validIds)];
  if (uniqueIds.length === 0) {
    return { id: -1 };
  }

  return { assignedToId: { in: uniqueIds } };
};

// ─── Build Prisma WHERE scope for inquiry delete queries
const buildInquiryDeleteScope = async (user) => {
  if (user?.roleName === 'admin' || user?.permissions?.has('inquiry.delete_all')) {
    return {};
  }

  const validIds = [];

  if (user?.permissions?.has('inquiry.delete_assigned') && user?.accountId) {
    validIds.push(user.accountId);
  }

  const uniqueIds = [...new Set(validIds)];
  if (uniqueIds.length === 0) {
    return { id: -1 };
  }

  return { assignedToId: { in: uniqueIds } };
};

// ─── Ownership resolver for single inquiry access
const resolveInquiryOwnership = async (req) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return null;

  const scope = await buildInquiryReadScope(req.user);

  return prisma.inquiry.findFirst({
    where: { id, ...scope },
    include: {
      student: true,
      assignedTo: {
        select: { id: true, fullName: true, email: true }
      },
      sourceData: {
        select: {
          id: true, name: true, label: true, level: true,
          parent: {
            select: {
              id: true, name: true, label: true, level: true,
              parent: {
                select: { id: true, name: true, label: true, level: true }
              }
            }
          }
        }
      },
      statusData: {
        select: {
          id: true, name: true, label: true, level: true,
          parent: {
            select: {
              id: true, name: true, label: true, level: true,
              parent: {
                select: { id: true, name: true, label: true, level: true }
              }
            }
          }
        }
      }
    }
  });
};

const inquiryPermissions = {
  READ: ['inquiry.read', 'inquiry.read_all', 'inquiry.read_group', 'inquiry.read_assigned'],
  UPDATE: ['inquiry.update', 'inquiry.update_all', 'inquiry.update_group', 'inquiry.update_assigned'],
  DELETE: ['inquiry.delete', 'inquiry.delete_all', 'inquiry.delete_assigned'],
  CREATE: 'inquiry.create',
  ASSIGN: 'inquiry.assign',
  IMPORT: 'inquiry.import',
  EXPORT: 'inquiry.export',
  SEARCH: ['student.read', 'inquiry.create', 'inquiry.assign', 'inquiry.update', 'inquiry.read', 'inquiry.read_all', 'inquiry.read_group', 'inquiry.read_assigned']
};

const withInquiryOwnership = { ownership: { resolver: resolveInquiryOwnership } };

module.exports = {
  inquiryPermissions,
  withInquiryOwnership,
  withOwnership: withInquiryOwnership,
  buildInquiryScope: buildInquiryReadScope,
  buildInquiryReadScope,
  buildInquiryUpdateScope,
  buildInquiryDeleteScope,
  resolveInquiryOwnership,
  getManagedGroupMemberIds
};

const prisma = require('../../config/db');

//Helper to get managed group member's account IDs for a manager
const getManagedGroupMemberIds = async (accountId) => {
  const groups = await prisma.userGroup.findMany({
    where: { groupLeaderId: accountId },
    select: {
      accounts: { select: { id: true } }
    }
  });

  const memberIds = groups.flatMap(g => g.accounts.map(a => a.id));
  return [...new Set(memberIds)];
};

//Build Prisma WHERE scope for inquiry queries
const buildInquiryScope = async (user) => {
  // Full expansion
  if (user.permissions.has('inquiry.read_all')) return {};

  // Base scope: own inquiries
  const validIds = [user.accountId];

  // Group expansion
  if (user.permissions.has('inquiry.read_group')) {
    const memberIds = await getManagedGroupMemberIds(user.accountId);
    validIds.push(...memberIds);
  }

  return { assignedToId: { in: validIds } };
};

//Ownership resolver for single inquiry access
const resolveInquiryOwnership = async (req) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return null;

  const scope = await buildInquiryScope(req.user);

  return prisma.inquiry.findFirst({
    where: { id, ...scope },
    include: {
      student: true,
      assignedTo: {
        select: { id: true, fullName: true, email: true }
      },
      sourceData: {
        select: { id: true, name: true, level: true }
      }
    }
  });
};

module.exports = {
  buildInquiryScope,
  resolveInquiryOwnership,
  getManagedGroupMemberIds
};

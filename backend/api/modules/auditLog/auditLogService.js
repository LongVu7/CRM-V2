const prisma = require('../../../config/db');

const logAction = async (params) => {
  try {
    const log = await prisma.auditLog.create({
      data: {
        actionType: params.actionType,
        actorId: params.actorId,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: params.oldValues,
        newValues: params.newValues,
        ipAddress: params.ipAddress
      }
    });
    return log;
  } catch (error) {
    // console.error(error) -> log it quietly if logger available
  }
};

const getAllAuditLogs = async (filters) => {
  const { page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const [logs, totalCount] = await prisma.$transaction([
    prisma.auditLog.findMany({
      skip,
      take: parseInt(limit, 10),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.auditLog.count()
  ]);

  return { logs, totalCount };
};

module.exports = {
  logAction,
  getAllAuditLogs
};

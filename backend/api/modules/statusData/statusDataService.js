const prisma = require('../../../config/db');

// ─── Get root options (interaction-level, first dropdown)
const getRootOptions = async () => {
  return prisma.statusData.findMany({
    where: { parentId: null, isActive: true },
    select: { id: true, name: true, label: true },
    orderBy: { sortOrder: 'asc' }
  });
};

// ─── Get children by parent ID (cascading dropdown)
const getChildrenById = async (id) => {
  return prisma.statusData.findMany({
    where: { parentId: Number(id), isActive: true },
    select: { id: true, name: true, label: true },
    orderBy: { sortOrder: 'asc' }
  });
};

// ─── Get status data by ID (includes parent chain for edit view restore)
const getStatusDataById = async (id) => {
  return prisma.statusData.findUnique({
    where: { id: Number(id) },
    include: {
      parent: {
        include: {
          parent: true
        }
      }
    }
  });
};

module.exports = {
  getRootOptions,
  getChildrenById,
  getStatusDataById
};

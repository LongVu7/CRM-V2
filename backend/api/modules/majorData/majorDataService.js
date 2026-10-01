const prisma = require('../../../config/db');

// ─── Get root options (for first dropdown)
const getRootOptions = async () => {
  return prisma.majorData.findMany({
    where: { parentId: null, isActive: true },
    select: { id: true, name: true, label: true },
    orderBy: { sortOrder: 'asc' }
  });
};

// ─── Get children by parent ID (for cascading dropdown)
const getChildrenById = async (id) => {
  return prisma.majorData.findMany({
    where: { parentId: Number(id), isActive: true },
    select: { id: true, name: true, label: true },
    orderBy: { sortOrder: 'asc' }
  });
};

module.exports = {
  getRootOptions,
  getChildrenById
};

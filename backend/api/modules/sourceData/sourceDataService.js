const prisma = require('../../../config/db');

// ─── Get root options (for first dropdown)
const getRootOptions = async () => {
  return prisma.sourceData.findMany({
    where: { parentId: null, isActive: true },
    select: { id: true, name: true, label: true },
    orderBy: { sortOrder: 'asc' }
  });
};

// ─── Get children by parent ID (for cascading dropdown)
const getChildrenById = async (id) => {
  return prisma.sourceData.findMany({
    where: { parentId: Number(id), isActive: true },
    select: { id: true, name: true, label: true },
    orderBy: { sortOrder: 'asc' }
  });
};

// ─── Get source data by ID (includes hierarchy for edit view)
const getSourceDataById = async (id) => {
  return prisma.sourceData.findUnique({
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
  getSourceDataById
};

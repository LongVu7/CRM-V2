const prisma = require('../../../config/db');

// ─── Get all oldProvinces (sorted by name, minimal fields for dropdown)
const getAllOldProvinces = async () => {
  return prisma.oldProvince.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });
};

module.exports = { getAllOldProvinces };

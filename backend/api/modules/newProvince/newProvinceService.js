const prisma = require('../../../config/db');

// ─── Get all newProvinces (sorted by name, minimal fields for dropdown)
const getAllNewProvinces = async () => {
  return prisma.newProvince.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });
};

module.exports = { getAllNewProvinces };

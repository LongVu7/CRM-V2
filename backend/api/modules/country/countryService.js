const prisma = require('../../../config/db');

// ─── Get all countries (sorted by name, minimal fields for dropdown)
const getAllCountries = async () => {
  return prisma.country.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' }
  });
};

module.exports = { getAllCountries };

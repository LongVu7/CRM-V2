const prisma = require('../../../config/db');
const { buildPaginationMeta } = require('../../utils/pagination');

// ─── Get all schools
const getAllSchools = async ({ page, limit, skip, oldProvinceId, search }) => {
  const where = {};
  if (oldProvinceId) where.oldProvinceId = Number(oldProvinceId);
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const [schools, totalCount] = await prisma.$transaction([
    prisma.school.findMany({
      where,
      skip,
      take: limit,
      include: { oldProvince: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' }
    }),
    prisma.school.count({ where })
  ]);

  return {
    schools,
    pagination: buildPaginationMeta(page, limit, totalCount)
  };
};

// ─── Get school options by old province 
const getSchoolOptions = async (oldProvinceId) => {
  const where = {};
  if (oldProvinceId) where.oldProvinceId = Number(oldProvinceId);

  return prisma.school.findMany({
    where,
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });
};

// ─── Get school by ID
const getSchoolById = async (id) => {
  const school = await prisma.school.findUnique({
    where: { id: Number(id) },
    include: { oldProvince: { select: { id: true, name: true } } }
  });

  if (!school) {
    const err = new Error('School not found');
    err.status = 404;
    throw err;
  }

  return school;
};

// ─── Create a school
const createSchool = async (data) => {
  // Verify old province exists
  const oldProvince = await prisma.oldProvince.findUnique({ where: { id: data.oldProvinceId } });
  if (!oldProvince) {
    const err = new Error(`Old Province with id ${data.oldProvinceId} does not exist`);
    err.status = 400;

    throw err;
  }

  try {
    return await prisma.school.create({ data });

  } catch (error) {
    if (error.code === 'P2002') {
      const err = new Error(`School "${data.name}" already exists in this old province`);
      err.status = 409;
      
      throw err;
    }
    throw error;
  }
};

// ─── Update a school
const updateSchool = async (id, data) => {
  try {
    return await prisma.school.update({
      where: { id: Number(id) },
      data: { ...data, updatedAt: new Date() }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('School not found');
      err.status = 404;
      throw err;
    }
    if (error.code === 'P2002') {
      const err = new Error(`School "${data.name}" already exists in this old province`);
      err.status = 409;
      throw err;
    }
    throw error;
  }
};

// ─── Delete a school
const deleteSchool = async (id) => {
  // Prevent deletion if students are assigned
  const studentCount = await prisma.student.count({ where: { schoolId: Number(id) } });
  if (studentCount > 0) {
    const err = new Error(`Cannot delete school: ${studentCount} student(s) are still assigned`);
    err.status = 400;
    throw err;
  }

  try {
    await prisma.school.delete({ where: { id: Number(id) } });
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('School not found');
      err.status = 404;
      throw err;
    }
    throw error;
  }
};

// ─── Statistics
const getStatistics = async () => {
  const [totalSchools, totalStudents, schoolsByOldProvince] = await prisma.$transaction([
    prisma.school.count(),
    prisma.student.count(),
    prisma.oldProvince.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { schools: true } }
      },
      orderBy: { name: 'asc' }
    })
  ]);

  return {
    totalSchools,
    totalStudents,
    schoolsByOldProvince: schoolsByOldProvince.map(c => ({
      oldProvinceId: c.id,
      oldProvinceName: c.name,
      schoolCount: c._count.schools
    }))
  };
};

module.exports = {
  getAllSchools,
  getSchoolOptions,
  getSchoolById,
  createSchool,
  updateSchool,
  deleteSchool,
  getStatistics
};

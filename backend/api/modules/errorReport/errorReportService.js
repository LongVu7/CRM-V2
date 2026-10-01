const prisma = require('../../../config/db');

const createReport = async ({ title, description, imageUrl }, reportedById) => {
  return prisma.errorReport.create({
    data: { title, description, imageUrl, reportedById },
    include: { reportedBy: { select: { id: true, fullName: true, email: true } } }
  });
};

const listReports = async () => {
  return prisma.errorReport.findMany({
    orderBy: { createdAt: 'desc' },
    include: { reportedBy: { select: { id: true, fullName: true, email: true } } }
  });
};

const getReportById = async (id) => {
  const report = await prisma.errorReport.findUnique({
    where: { id: Number(id) },
    include: { reportedBy: { select: { id: true, fullName: true, email: true } } }
  });
  if (!report) {
    const err = new Error('Report not found');
    err.status = 404;
    throw err;
  }
  return report;
};

const updateReportStatus = async (id, status) => {
  return prisma.errorReport.update({
    where: { id: Number(id) },
    data: { status, updatedAt: new Date() }
  });
};

module.exports = { createReport, listReports, getReportById, updateReportStatus };

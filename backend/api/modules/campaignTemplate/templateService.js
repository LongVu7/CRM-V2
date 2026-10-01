const prisma = require('../../../config/db');

// ─── CRUD for Campaign Templates ───

const createTemplate = async (data, createdById) => {
  return prisma.campaignTemplate.create({
    data: {
      name: data.name,
      channel: data.channel,
      subject: data.subject || null,
      content: data.content,
      status: data.status || 'ACTIVE',
      createdById
    }
  });
};

const getTemplateById = async (id) => {
  return prisma.campaignTemplate.findUnique({
    where: { id: Number(id) }
  });
};

const updateTemplate = async (id, data) => {
  const updateData = { ...data, updatedAt: new Date() };
  if (data.channel === 'SMS' || data.channel === 'ZNS') {
    updateData.subject = null;
  }
  
  return prisma.campaignTemplate.update({
    where: { id: Number(id) },
    data: updateData
  });
};

const deleteTemplate = async (id) => {
  const templateId = Number(id);
  
  // Check if template is used by any activities
  const usages = await prisma.campaignActivity.count({
    where: { templateId }
  });

  if (usages > 0) {
    // If used, archive it
    return prisma.campaignTemplate.update({
      where: { id: templateId },
      data: { status: 'ARCHIVED', updatedAt: new Date() }
    });
  } else {
    // If entirely unused, hard delete
    return prisma.campaignTemplate.delete({
      where: { id: templateId }
    });
  }
};

const { buildPaginationMeta } = require('../../utils/pagination');

const listTemplates = async ({ page, limit, skip, search, channel, status }) => {
  const where = {};
  
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }
  if (channel) {
    where.channel = channel;
  }
  if (status) {
    where.status = status;
  } else {
    // By default, don't show archived templates in standard lists unless explicitly requested
    where.status = { not: 'ARCHIVED' };
  }

  const [templates, totalCount] = await prisma.$transaction([
    prisma.campaignTemplate.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.campaignTemplate.count({ where })
  ]);

  return {
    templates,
    pagination: buildPaginationMeta(page, limit, totalCount)
  };
};

module.exports = {
  createTemplate,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  listTemplates
};

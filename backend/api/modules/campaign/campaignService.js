const prisma = require('../../../config/db');
const { sendMail } = require('../../../config/mailer');
const templateRenderer = require('../campaignTemplate/templateRenderer');

// ─── Campaign CRUD ───

const createCampaign = async (data, userOrId) => {
  const createdById = typeof userOrId === 'object' && userOrId !== null
    ? (userOrId.accountId || userOrId.id)
    : userOrId;
  const userTeamIds = typeof userOrId === 'object' && Array.isArray(userOrId.teamIds)
    ? userOrId.teamIds
    : [];

  let effectiveTeamId = data.teamId;
  if (!effectiveTeamId) {
    if (userTeamIds.length > 0) {
      effectiveTeamId = userTeamIds[0];
    } else if (data.ownerId) {
      const owner = await prisma.account.findUnique({
        where: { id: Number(data.ownerId) },
        include: { teamMemberships: true }
      });
      effectiveTeamId = owner?.teamMemberships?.[0]?.teamId || null;
    }
  }

  const { teamId: _, ...rest } = data;

  return prisma.campaign.create({
    data: {
      ...rest,
      startDate: new Date(data.startDate),
      ...(data.endDate && { endDate: new Date(data.endDate) }),
      createdById,
      ...(effectiveTeamId && { teamId: Number(effectiveTeamId) })
    },
    include: {
      owner: { select: { id: true, fullName: true, email: true } },
      team: { select: { id: true, name: true } }
    }
  });
};

const updateCampaign = async (id, data) => {
  const updateData = { ...data, updatedAt: new Date() };
  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.endDate) updateData.endDate = new Date(data.endDate);
  if (data.teamId !== undefined) {
    updateData.teamId = data.teamId ? Number(data.teamId) : null;
  }

  return prisma.campaign.update({
    where: { id: Number(id) },
    data: updateData,
    include: {
      owner: { select: { id: true, fullName: true, email: true } },
      team: { select: { id: true, name: true } }
    }
  });
};

const getCampaignById = async (id) => {
  return prisma.campaign.findUnique({
    where: { id: Number(id) },
    include: {
      owner: { select: { id: true, fullName: true, email: true } },
      team: { select: { id: true, name: true } },
      activities: {
        orderBy: { createdAt: 'desc' },
        include: {
          recipients: true,
          template: true
        }
      }
    }
  });
};

const getAvailableOwners = async () => {
  return prisma.account.findMany({
    where: { isActive: true },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: { select: { id: true, name: true } }
    },
    orderBy: { fullName: 'asc' }
  });
};

const listCampaigns = async (permissionScope = {}) => {
  return prisma.campaign.findMany({
    where: { ...permissionScope },
    orderBy: { createdAt: 'desc' },
    include: {
      owner: { select: { id: true, fullName: true, email: true } },
      team: { select: { id: true, name: true } },
      _count: { select: { activities: true } }
    }
  });
};

const deleteCampaign = async (id) => {
  return prisma.campaign.delete({
    where: { id: Number(id) }
  });
};

// ─── Activity CRUD ───

const createActivity = async (campaignId, data) => {
  return prisma.campaignActivity.create({
    data: {
      ...data,
      campaignId: Number(campaignId),
      ...(data.scheduledAt && { scheduledAt: new Date(data.scheduledAt) })
    }
  });
};

const updateActivity = async (activityId, data) => {
  const updateData = { ...data, updatedAt: new Date() };
  if (data.scheduledAt) updateData.scheduledAt = new Date(data.scheduledAt);

  return prisma.campaignActivity.update({
    where: { id: Number(activityId) },
    data: updateData
  });
};

const deleteActivity = async (activityId) => {
  return prisma.campaignActivity.delete({
    where: { id: Number(activityId) }
  });
};

// ─── Activity Recipients ───

const addRecipients = async (activityId, inquiryIds) => {
  const activity = await prisma.campaignActivity.findUnique({
    where: { id: Number(activityId) }
  });
  if (!activity) throw new Error('Activity not found');

  // Find existing recipients
  const existingRecipients = await prisma.campaignRecipient.findMany({
    where: { activityId: Number(activityId) }
  });

  const existingInquiryIds = existingRecipients.map(r => r.inquiryId);
  
  // Determine which to remove and which to add
  const toRemoveInquiryIds = existingInquiryIds.filter(id => !inquiryIds.includes(id));
  const toAddInquiryIds = inquiryIds.filter(id => !existingInquiryIds.includes(id));

  // Remove unselected recipients
  if (toRemoveInquiryIds.length > 0) {
    await prisma.campaignRecipient.deleteMany({
      where: {
        activityId: Number(activityId),
        inquiryId: { in: toRemoveInquiryIds }
      }
    });
  }

  // Add new recipients
  if (toAddInquiryIds.length > 0) {
    const inquiries = await prisma.inquiry.findMany({
      where: { id: { in: toAddInquiryIds } },
      include: { student: true }
    });

    const recipientsData = inquiries.map(inq => ({
      activityId: Number(activityId),
      inquiryId: inq.id,
      email: inq.student?.email || null,
      mobile: inq.student?.mobile || null,
      fullName: inq.student?.fullName || null,
      status: 'pending'
    }));

    await prisma.campaignRecipient.createMany({
      data: recipientsData
    });
  }
  
  return { success: true };
};

// ─── Send Email Activity ───

const sendEmailActivity = async (activityId) => {
  const activity = await prisma.campaignActivity.findUnique({
    where: { id: Number(activityId) },
    include: { recipients: true }
  });

  if (!activity) throw new Error('Activity not found');
  if (activity.type !== 'EMAIL') throw new Error('Only EMAIL activities can be sent');
  if (!activity.content) throw new Error('Activity has no content to send');

  const emailRecipients = activity.recipients.filter(r => r.email);
  if (emailRecipients.length === 0) throw new Error('No recipients with email addresses');

  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of emailRecipients) {
    try {
      const dataObj = {
        fullName: recipient.fullName || '',
        email: recipient.email || '',
        mobile: recipient.mobile || ''
      };
      
      const html = templateRenderer.renderContent(activity.content, dataObj);

      await sendMail({
        to: recipient.email,
        subject: activity.subject || activity.name,
        html
      });

      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: 'sent' }
      });
      sentCount++;
    } catch (err) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: 'failed' }
      });
      failedCount++;
    }
  }

  // Update activity status
  const newStatus = failedCount === emailRecipients.length ? 'failed' : 'sent';
  await prisma.campaignActivity.update({
    where: { id: Number(activityId) },
    data: { status: newStatus, updatedAt: new Date() }
  });

  return { sentCount, failedCount, total: emailRecipients.length };
};

module.exports = {
  createCampaign,
  updateCampaign,
  getCampaignById,
  getAvailableOwners,
  listCampaigns,
  deleteCampaign,
  createActivity,
  updateActivity,
  deleteActivity,
  addRecipients,
  sendEmailActivity
};

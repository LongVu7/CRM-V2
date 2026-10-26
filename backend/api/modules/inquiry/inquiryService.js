const prisma = require('../../../config/db');
const { applyStatusTransition } = require('../../utils/statusTransition');
const { buildHierarchyTree } = require('../../utils/hierarchyUtils');
const { buildPaginationMeta } = require('../../utils/pagination');

// ─── Error factory
const handleError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// ─── Get options for inquiry form (sources tree & statuses tree)
const getInquiryOptions = async () => {
  const [sourcesRaw, statusesRaw] = await prisma.$transaction([
    prisma.sourceData.findMany({
      where: { isActive: true },
      select: { id: true, name: true, label: true, level: true, parentId: true, sortOrder: true },
      orderBy: { sortOrder: 'asc' }
    }),
    prisma.statusData.findMany({
      where: { isActive: true },
      select: { id: true, name: true, label: true, level: true, parentId: true, sortOrder: true },
      orderBy: { sortOrder: 'asc' }
    })
  ]);

  const sources = buildHierarchyTree(sourcesRaw);
  const statuses = buildHierarchyTree(statusesRaw);

  return {
    sources,
    statuses
  };
};

// ─── Shared query 
const inquiryInclude = {
  student: true,
  team: {
    select: { id: true, name: true }
  },
  assignedTo: {
    select: { id: true, fullName: true, email: true }
  },
  sourceData: {
    select: {
      id: true, name: true, label: true, level: true,
      parent: {
        select: {
          id: true, name: true, label: true, level: true,
          parent: {
            select: { id: true, name: true, label: true, level: true }
          }
        }
      }
    }
  },
  statusData: {
    select: {
      id: true, name: true, label: true, level: true,
      parent: {
        select: {
          id: true, name: true, label: true, level: true,
          parent: {
            select: { id: true, name: true, label: true, level: true }
          }
        }
      }
    }
  }
};


const buildInquiryData = ({ assignedToId, teamId, sourceDataId, statusDataId, dataReceived, interactionAt, createDate, eventNames, ...rest }) => ({
  ...rest,
  ...(eventNames !== undefined && { eventNames: eventNames === null ? [] : eventNames }),
  ...(dataReceived !== undefined && { dataReceived: dataReceived ? new Date(dataReceived) : null }),
  ...(interactionAt !== undefined && { interactionAt: interactionAt ? new Date(interactionAt) : null }),
  ...(createDate !== undefined && { createDate: createDate ? new Date(createDate) : null }),
  ...(assignedToId !== undefined && { assignedTo: assignedToId ? { connect: { id: parseInt(assignedToId, 10) } } : { disconnect: true } }),
  ...(teamId !== undefined && { team: teamId ? { connect: { id: parseInt(teamId, 10) } } : { disconnect: true } }),
  ...(sourceDataId !== undefined && { sourceData: sourceDataId ? { connect: { id: parseInt(sourceDataId, 10) } } : { disconnect: true } }),
  ...(statusDataId !== undefined && { statusData: statusDataId ? { connect: { id: parseInt(statusDataId, 10) } } : { disconnect: true } })
});


const fetchInquiry = (txOrPrisma, id) =>
  txOrPrisma.inquiry.findUnique({
    where: { id },
    include: inquiryInclude
  });






// ─── Build Inquiry Where Clause
const buildInquiryWhere = (filters, permissionScope = {}) => {
  const where = { ...permissionScope };

  // Optional triage filter for unassigned leads within authorized scope
  if (filters.unassignedOnly === true || filters.unassignedOnly === 'true') {
    where.assignedToId = null;
  }

  if (filters.hasStudent) {
    where.studentId = { not: null };
  }

  if (filters.search) {
    const searchCondition = [
      { description: { contains: filters.search, mode: 'insensitive' } },
      { student: { fullName: { contains: filters.search, mode: 'insensitive' } } }
    ];
    where.AND = [...(where.AND || []), { OR: searchCondition }];
  }

  // Existing specific status and assignment filters for Inquiry
  if (filters.statusGeneral) {
    where.AND = [...(where.AND || []), {
      statusData: {
        parent: { label: filters.statusGeneral }
      }
    }];
  }
  if (filters.assignedTo) {
    where.assignedToId = parseInt(filters.assignedTo, 10);
  }

  // Student specific filters
  if (filters.birthYear || filters.oldProvinceId) {
    where.student = { ...(where.student || {}) };

    if (filters.birthYear) {
      const year = parseInt(filters.birthYear, 10);
      where.student.birthDate = {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
      };
    }

    if (filters.oldProvinceId) {
      where.student.education = {
        school: { oldProvinceId: parseInt(filters.oldProvinceId, 10) }
      };
    }
  }

  return where;
};

// ─── List all inquiries
const getAllInquiries = async (filters) => {
  const { page, limit, skip, permissionScope, sortField, sortOrder } = filters;
  const where = buildInquiryWhere(filters, permissionScope);

  //Sort column 
  let orderBy = { createdAt: 'desc' };
  if (sortField) {
    const order = parseInt(sortOrder, 10) === 1 ? 'asc' : 'desc';
    const keys = sortField.split('.');
    orderBy = {};
    let current = orderBy;
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = order;
  }

  const [inquiries, totalCount] = await prisma.$transaction([
    prisma.inquiry.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: inquiryInclude
    }),
    prisma.inquiry.count({ where })
  ]);

  return {
    inquiries,
    pagination: buildPaginationMeta(page, limit, totalCount)
  };
};

// ─── Get specific inquiry by ID
const getInquiryById = async (id) => {
  const inquiry = await fetchInquiry(prisma, parseInt(id, 10));
  if (!inquiry)
    throw handleError('Inquiry not found', 404);
  return inquiry;
};

/**
 * Injects or validates teamId during record creation.
 */
const resolveCreationTeamId = (reqUser, requestedTeamId) => {
  if (!reqUser) return requestedTeamId ? parseInt(requestedTeamId, 10) : null;

  const roleName = (reqUser.roleName || '').toLowerCase();
  if (roleName === 'admin' || roleName === 'administrator') {
    return requestedTeamId ? parseInt(requestedTeamId, 10) : null;
  }

  const ledTeamIds = reqUser.ledTeamIds || [];
  const memberTeamId = reqUser.memberTeamId;

  // Single-team member or single-team leader -> enforce automatic attribution
  if (ledTeamIds.length <= 1) {
    const defaultTeamId = ledTeamIds[0] || memberTeamId || (reqUser.teamIds && reqUser.teamIds[0]);
    if (!defaultTeamId) {
      throw handleError('User does not belong to any team to own this record', 400);
    }
    return parseInt(defaultTeamId, 10);
  }

  // Multi-team leader -> validate submitted teamId against authorized teams
  if (!requestedTeamId) {
    throw handleError('Multi-team leaders must specify a teamId for new records', 400);
  }

  const tid = parseInt(requestedTeamId, 10);
  const authorized = (reqUser.authorizedTeamIds || reqUser.teamIds || []).includes(tid);
  if (!authorized) {
    throw handleError('You are not authorized to create records for this team', 403);
  }

  return tid;
};

/** Create inquiry cases:
 *   1. Create and link an existing student
 *   2. create a new inquiry with new student inline
 *   3. Create an inquiry alone
 */
const createInquiry = async ({ studentId, student, assignedToId, teamId, ...inquiryFields }, user) => {
  // Auto assign staff who created inquiry 
  const creatorAssignedToId = assignedToId || user?.accountId;
  const effectiveTeamId = resolveCreationTeamId(user, teamId);

  const inquiryData = buildInquiryData({
    assignedToId: creatorAssignedToId,
    teamId: effectiveTeamId,
    ...inquiryFields
  });

  if (studentId) return _createWithExistingStudent(inquiryData, studentId, user, effectiveTeamId);
  if (student?.fullName) return _createWithNewStudent(inquiryData, student, user, effectiveTeamId);
  return _createAlone(inquiryData, user, effectiveTeamId);
};

const _createWithExistingStudent = async (inquiryData, studentId, user, effectiveTeamId) => {
  const sid = parseInt(studentId, 10);

  const existing = await prisma.student.findUnique({ where: { id: sid } });
  if (!existing)
    throw handleError(
      'Student not found with the provided studentId',
      404
    );

  // Check if this student is already linked to another inquiry
  const existingLink = await prisma.inquiry.findFirst({
    where: { studentId: sid }
  });
  if (existingLink) {
    throw handleError(
      `This student is already linked to another inquiry`,
      409
    );
  }


  try {
    return await prisma.$transaction(async (tx) => {
      let milestoneUpdates = {};
      const statusId = inquiryData.statusData?.connect?.id;
      if (statusId) {
        milestoneUpdates = await applyStatusTransition({ tx, inquiry: {}, newStatusDataId: statusId });
      }
      const { id } = await tx.inquiry.create({
        data: { ...inquiryData, ...milestoneUpdates, student: { connect: { id: sid } } }
      });
      if (statusId) {
        await tx.inquiryStatusHistory.create({
          data: {
            inquiryId: id,
            previousStatusId: null,
            newStatusId: statusId,
            changedById: user?.accountId || null,
            teamId: effectiveTeamId || inquiryData.team?.connect?.id || null,
            notes: null,
            changedAt: new Date()
          }
        });
      }
      return fetchInquiry(tx, id);
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const fields = error.meta?.target || error.meta?.driverAdapterError?.cause?.constraint?.fields || [];
      let message = 'An inquiry with this data already exists';
      if (fields.includes('studentId') || fields.includes('student_id')) {
        message = 'This student is already linked to another inquiry';
      }
      const err = new Error(message);
      err.status = 409;
      throw err;
    }
    throw error;
  }
};

//Private method 
const _createWithNewStudent = async (inquiryData, student, user, effectiveTeamId) => {
  const { specializedRegister, education, ...studentData } = student;
  try {
    return await prisma.$transaction(async (tx) => {
      let milestoneUpdates = {};
      const statusId = inquiryData.statusData?.connect?.id;
      if (statusId) {
        milestoneUpdates = await applyStatusTransition({ tx, inquiry: {}, newStatusDataId: statusId });
      }
      const { id } = await tx.inquiry.create({
        data: {
          ...inquiryData,
          ...milestoneUpdates,
          student: {
            create: {
              ...studentData,
              ...(studentData.birthDate && { birthDate: new Date(studentData.birthDate) }),
              ...(education && {
                education: {
                  create: education
                }
              }),
              ...(specializedRegister && {
                specializedRegister: {
                  create: specializedRegister
                }
              })
            }
          }
        }
      });
      if (statusId) {
        await tx.inquiryStatusHistory.create({
          data: {
            inquiryId: id,
            previousStatusId: null,
            newStatusId: statusId,
            changedById: user?.accountId || null,
            teamId: effectiveTeamId || inquiryData.team?.connect?.id || null,
            notes: null,
            changedAt: new Date()
          }
        });
      }
      return fetchInquiry(tx, id);
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const fields = error.meta?.target || error.meta?.driverAdapterError?.cause?.constraint?.fields || [];
      let message = 'An inquiry or associated student with this data already exists';
      if (fields.includes('mobile')) {
        message = `Student with mobile "${studentData.mobile}" already exists`;
      } else if (fields.includes('studentId') || fields.includes('student_id')) {
        message = 'This student is already linked to another inquiry';
      }
      const err = new Error(message);
      err.status = 409;
      throw err;
    }
    throw error;
  }
};

const _createAlone = async (inquiryData, user, effectiveTeamId) => {
  return await prisma.$transaction(async (tx) => {
    let milestoneUpdates = {};
    const statusId = inquiryData.statusData?.connect?.id;
    if (statusId) {
      milestoneUpdates = await applyStatusTransition({ tx, inquiry: {}, newStatusDataId: statusId });
    }
    const { id } = await tx.inquiry.create({ data: { ...inquiryData, ...milestoneUpdates } });
    if (statusId) {
      await tx.inquiryStatusHistory.create({
        data: {
          inquiryId: id,
          previousStatusId: null,
          newStatusId: statusId,
          changedById: user?.accountId || null,
          teamId: effectiveTeamId || inquiryData.team?.connect?.id || null,
          notes: null,
          changedAt: new Date()
        }
      });
    }
    return fetchInquiry(tx, id);
  });
};


// ─── Update inquiry
const updateInquiry = async (id, updateData, user) => {
  const { sourceDataId, statusDataId, assignedToId, teamId, statusNotes, ...rest } = updateData;

  const data = {
    ...rest,
    updatedAt: new Date(),
    ...(rest.dataReceived && { dataReceived: new Date(rest.dataReceived) })
  };

  // Handle teamId: connect or disconnect
  if (teamId !== undefined) {
    data.team = teamId
      ? { connect: { id: parseInt(teamId, 10) } }
      : { disconnect: true };
  }

  // Handle assignedToId: connect or disconnect
  if (assignedToId !== undefined) {
    data.assignedTo = assignedToId
      ? { connect: { id: parseInt(assignedToId, 10) } }
      : { disconnect: true };
  }

  // Handle sourceDataId: connect or disconnect
  if (sourceDataId !== undefined) {
    data.sourceData = sourceDataId
      ? { connect: { id: parseInt(sourceDataId, 10) } }
      : { disconnect: true };
  }

  // Handle statusDataId: connect or disconnect
  if (statusDataId !== undefined) {
    data.statusData = statusDataId
      ? { connect: { id: parseInt(statusDataId, 10) } }
      : { disconnect: true };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const currentInquiry = await tx.inquiry.findUnique({ where: { id: parseInt(id, 10) } });
      if (!currentInquiry) throw handleError('Inquiry not found', 404);

      let milestoneUpdates = {};
      const newStatusDataId = statusDataId !== undefined ? (statusDataId ? parseInt(statusDataId, 10) : null) : currentInquiry.statusDataId;

      if (newStatusDataId && newStatusDataId !== currentInquiry.statusDataId) {
        milestoneUpdates = await applyStatusTransition({
          tx,
          inquiry: currentInquiry,
          newStatusDataId
        });

        const effectiveTeamId = (teamId !== undefined && teamId !== null)
          ? parseInt(teamId, 10)
          : currentInquiry.teamId;

        await tx.inquiryStatusHistory.create({
          data: {
            inquiryId: currentInquiry.id,
            previousStatusId: currentInquiry.statusDataId,
            newStatusId: newStatusDataId,
            changedById: user?.accountId || null,
            teamId: effectiveTeamId || null,
            notes: statusNotes || null,
            changedAt: new Date()
          }
        });
      }

      return await tx.inquiry.update({
        where: { id: parseInt(id, 10) },
        data: { ...data, ...milestoneUpdates },
        include: inquiryInclude
      });
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const fields = error.meta?.target || error.meta?.driverAdapterError?.cause?.constraint?.fields || [];
      let message = 'An inquiry with this data already exists';
      if (fields.includes('studentId') || fields.includes('student_id')) {
        message = 'This student is already linked to another inquiry';
      }
      const err = new Error(message);
      err.status = 409;
      throw err;
    }
    throw error;
  }
};


// ─── Delete inquiry (preserves student records)
const deleteInquiry = async (id) => {
  const inquiryId = parseInt(id, 10);
  await prisma.inquiry.delete({ where: { id: inquiryId } });
};


// ─── Assign a student to an inquiry
const assignStudentToInquiry = async (inquiryId, studentId) => {
  const iid = parseInt(inquiryId, 10);
  const sid = parseInt(studentId, 10);

  const inquiry = await prisma.inquiry.findUnique({ where: { id: iid } });
  if (!inquiry) throw handleError('Inquiry not found', 404);

  const student = await prisma.student.findUnique({ where: { id: sid } });
  if (!student) throw handleError('Student not found', 404);

  // Check if this student is already linked to a different inquiry
  const existingLink = await prisma.inquiry.findFirst({
    where: { studentId: sid, id: { not: iid } }
  });
  if (existingLink) {
    throw handleError(
      `This student is already linked to another inquiry`,
      409
    );
  }

  try {
    await prisma.inquiry.update({
      where: { id: iid },
      data: { student: { connect: { id: sid } } }
    });
    return { inquiryId: iid, student };
  } catch (error) {
    if (error.code === 'P2002') {
      const fields = error.meta?.target || error.meta?.driverAdapterError?.cause?.constraint?.fields || [];
      let message = 'An inquiry with this data already exists';
      if (fields.includes('studentId') || fields.includes('student_id')) {
        message = 'This student is already linked to another inquiry';
      }
      const err = new Error(message);
      err.status = 409;
      throw err;
    }
    throw error;
  }
};

// ─── Unassign a student from an inquiry
const unassignStudentFromInquiry = async (inquiryId, studentId) => {
  const iid = parseInt(inquiryId, 10);
  const sid = parseInt(studentId, 10);

  const inquiry = await prisma.inquiry.findUnique({ where: { id: iid } });
  if (!inquiry) throw handleError('Inquiry not found', 404);
  if (inquiry.studentId !== sid) throw handleError('Student is not linked to this inquiry', 400);

  await prisma.inquiry.update({ where: { id: iid }, data: { student: { disconnect: true } } });
};

// ─── Assign an account to an inquiry
const assignAccountToInquiry = async (inquiryId, accountId) => {
  const iid = parseInt(inquiryId, 10);
  const aid = parseInt(accountId, 10);

  const account = await prisma.account.findUnique({
    where: { id: aid },
    include: { teamMemberships: true }
  });
  if (!account) throw handleError('Account not found', 404);

  const newTeamId = account.teamMemberships?.[0]?.teamId || null;

  return prisma.inquiry.update({
    where: { id: iid },
    data: {
      assignedToId: aid,
      ...(newTeamId && { teamId: newTeamId }),
      updatedAt: new Date()
    },
    include: inquiryInclude
  });
};

// ─── Search students (for assignment UI)
const searchStudents = async (query) => {
  const where = {};
  if (query && typeof query === 'string' && query.trim().length > 0) {
    const q = query.trim();
    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { mobile: { contains: q, mode: 'insensitive' } }
    ];
  }

  return prisma.student.findMany({
    where,
    select: {
      id: true,
      fullName: true,
      email: true,
      mobile: true,
      birthDate: true,
      gender: true,
      inquiry: {
        select: { id: true }
      }
    },
    take: 1000,
    orderBy: { fullName: 'asc' }
  });
};

// ─── Search staff accounts (for assignment UI)
const searchAccounts = async (query) => {
  const where = {
    isActive: true
  };

  if (query && typeof query === 'string' && query.trim().length > 0) {
    const q = query.trim();
    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } }
    ];
  }

  return prisma.account.findMany({
    where,
    select: {
      id: true,
      fullName: true,
      email: true,
      role: { select: { name: true } }
    },
    take: 500,
    orderBy: { fullName: 'asc' }
  });
};

// ─── Export Inquiries
const exportInquiries = async (filters, permissionScope = {}) => {
  const where = buildInquiryWhere(filters, permissionScope);
  const inquiries = await prisma.inquiry.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      student: true,
      assignedTo: true,
      sourceData: {
        include: {
          parent: {
            include: {
              parent: true
            }
          }
        }
      },
      statusData: {
        include: {
          parent: {
            include: {
              parent: true
            }
          }
        }
      }
    }
  });

  return inquiries.map(i => ({

    // Assigned Staff
    'Assigned Staff': i.assignedTo?.fullName || '',
    'Assigned Staff Email': i.assignedTo?.email || '',
    // Source and Status
    'Lead Source': i.sourceData?.parent?.parent?.label || '',
    'Source Detail': i.sourceData?.parent?.label || '',
    'Approach Method': i.sourceData?.label || '',
    'Interaction Status': i.statusData?.parent?.parent?.label || '',
    'Status General': i.statusData?.parent?.label || '',
    'Status Detail': i.statusData?.label || '',
    // Student Details
    'Full Name': i.student?.fullName || '',
    'Gender': i.student?.gender || '',
    'Date of Birth': i.student?.birthDate ? i.student?.birthDate.toISOString().split('T')[0] : '',
    'Mobile': i.student?.mobile || '',
    'Other Phone': i.student?.otherPhone || '',
    'Email': i.student?.email || '',
    'Primary Address': i.student?.primaryAddress || '',
    // Inquiry basic details
    'Description': i.description || '',
    'Data Received': i.dataReceived ? i.dataReceived.toISOString().split('T')[0] : '',
    'Group Tele': i.groupTele || '',
    'Interaction At': i.interactionAt ? i.interactionAt.toISOString().split('T')[0] : '',
    'Call Count': i.callCount || 0,
    'Event Names': i.eventNames?.length > 0 ? i.eventNames.join(', ') : '',
    'Call Log': i.callLog || '',
    'Compensation Status': i.compensationStatus || '',
    'Priority': i.priority || '',
    'Create Date': i.createDate ? i.createDate.toISOString().split('T')[0] : '',
    'Created At': i.createdAt ? i.createdAt.toISOString().split('T')[0] : '',
    'First Processed At': i.firstProcessedAt ? i.firstProcessedAt.toISOString().split('T')[0] : '',
    'First Interacted At': i.firstInteractedAt ? i.firstInteractedAt.toISOString().split('T')[0] : '',
    'NB At': i.nbAt ? i.nbAt.toISOString().split('T')[0] : '',
    'Updated At': i.updatedAt ? i.updatedAt.toISOString().split('T')[0] : '',


  }));
};

module.exports = {
  getAllInquiries,
  getInquiryById,
  createInquiry,
  updateInquiry,
  deleteInquiry,
  assignStudentToInquiry,
  unassignStudentFromInquiry,
  assignAccountToInquiry,
  searchStudents,
  searchAccounts,
  exportInquiries,
  getInquiryOptions,
  resolveCreationTeamId
};
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
  student: {
    include: {
      education: {
        include: {
          school: { select: { id: true, name: true, oldProvince: { select: { id: true, name: true } } } },
          oldProvince: { select: { id: true, name: true } },
          newProvince: { select: { id: true, name: true } },
          country: { select: { id: true, name: true } }
        }
      },
      specializedRegister: {
        include: {
          interestedMajor: { select: { id: true, name: true, label: true } },
          specificMajor: { select: { id: true, name: true, label: true } }
        }
      }
    }
  },
  assignedTo: {
    select: { id: true, fullName: true, email: true }
  },
  createdBy: {
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


const buildInquiryData = ({ assignedToId, createdById, sourceDataId, statusDataId, dataReceived, interactionAt, createDate, eventNames, ...rest }) => ({
  ...rest,
  ...(eventNames !== undefined && { eventNames: eventNames === null ? [] : eventNames }),
  ...(dataReceived !== undefined && { dataReceived: dataReceived ? new Date(dataReceived) : null }),
  ...(interactionAt !== undefined && { interactionAt: interactionAt ? new Date(interactionAt) : null }),
  ...(createDate !== undefined && { createDate: createDate ? new Date(createDate) : null }),
  ...(assignedToId ? { assignedTo: { connect: { id: parseInt(assignedToId, 10) } } } : {}),
  ...(createdById ? { createdBy: { connect: { id: parseInt(createdById, 10) } } } : {}),
  ...(sourceDataId ? { sourceData: { connect: { id: parseInt(sourceDataId, 10) } } } : {}),
  ...(statusDataId ? { statusData: { connect: { id: parseInt(statusDataId, 10) } } } : {})
});


const fetchInquiry = (txOrPrisma, id) =>
  txOrPrisma.inquiry.findUnique({
    where: { id },
    include: inquiryInclude
  });






// ─── Build Inquiry Where Clause
const buildInquiryWhere = (filters, permissionScope = {}) => {
  const andClauses = [];

  if (permissionScope && Object.keys(permissionScope).length > 0) {
    andClauses.push(permissionScope);
  }

  const conditions = {};

  // Optional triage filter for unassigned leads within authorized scope
  if (filters.unassignedOnly === true || filters.unassignedOnly === 'true') {
    conditions.assignedToId = null;
  }

  if (filters.hasStudent) {
    conditions.studentId = { not: null };
  }

  if (filters.assignedTo) {
    conditions.assignedToId = parseInt(filters.assignedTo, 10);
  }

  if (filters.statusGeneral) {
    conditions.statusData = {
      parent: { label: filters.statusGeneral }
    };
  }

  if (filters.search) {
    const searchCondition = [
      { description: { contains: filters.search, mode: 'insensitive' } },
      { student: { fullName: { contains: filters.search, mode: 'insensitive' } } }
    ];
    andClauses.push({ OR: searchCondition });
  }

  // Student specific filters
  if (filters.birthYear || filters.oldProvinceId) {
    conditions.student = {};

    if (filters.birthYear) {
      const year = parseInt(filters.birthYear, 10);
      conditions.student.birthDate = {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
      };
    }

    if (filters.oldProvinceId) {
      conditions.student.education = {
        OR: [
          { oldProvinceId: parseInt(filters.oldProvinceId, 10) },
          { school: { oldProvinceId: parseInt(filters.oldProvinceId, 10) } }
        ]
      };
    }
  }

  if (Object.keys(conditions).length > 0) {
    andClauses.push(conditions);
  }

  if (andClauses.length === 0) return {};
  if (andClauses.length === 1) return andClauses[0];
  return { AND: andClauses };
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


/** Create inquiry cases:
 *   1. Create and link an existing student
 *   2. create a new inquiry with new student inline
 *   3. Create an inquiry alone
 */
const createInquiry = async ({ studentId, student, assignedToId, ...inquiryFields }, user) => {
  // If assignedToId is explicitly provided, parse it; otherwise keep unassigned (null)
  const targetAssignedToId = assignedToId ? parseInt(assignedToId, 10) : null;

  const inquiryData = buildInquiryData({
    assignedToId: targetAssignedToId,
    createdById: user?.accountId || user?.id || null,
    ...inquiryFields
  });

  if (studentId) return _createWithExistingStudent(inquiryData, studentId, user);
  if (student?.fullName) return _createWithNewStudent(inquiryData, student, user);
  return _createAlone(inquiryData, user);
};

const _createWithExistingStudent = async (inquiryData, studentId, user) => {
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

  // Re
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
            teamId: null,
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
const _createWithNewStudent = async (inquiryData, student, user) => {
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
            teamId: null,
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

const _createAlone = async (inquiryData, user) => {
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
          teamId: null,
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
  const { sourceDataId, statusDataId, assignedToId, statusNotes, ...rest } = updateData;

  const data = {
    ...rest,
    updatedAt: new Date(),
    ...(rest.dataReceived && { dataReceived: new Date(rest.dataReceived) })
  };

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

        await tx.inquiryStatusHistory.create({
          data: {
            inquiryId: currentInquiry.id,
            previousStatusId: currentInquiry.statusDataId,
            newStatusId: newStatusDataId,
            changedById: user?.accountId || null,
            teamId: null,
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
  const aid = accountId ? parseInt(accountId, 10) : null;

  const currentInquiry = await prisma.inquiry.findUnique({ where: { id: iid } });
  if (!currentInquiry) throw handleError('Inquiry not found', 404);

  if (aid) {
    const account = await prisma.account.findUnique({ where: { id: aid } });
    if (!account) throw handleError('Account not found', 404);
  }

  return prisma.inquiry.update({
    where: { id: iid },
    data: {
      assignedToId: aid,
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
    include: {
      inquiry: {
        select: { id: true }
      },
      education: {
        include: {
          school: { select: { id: true, name: true, oldProvince: { select: { id: true, name: true } } } },
          oldProvince: { select: { id: true, name: true } },
          newProvince: { select: { id: true, name: true } },
          country: { select: { id: true, name: true } }
        }
      },
      specializedRegister: {
        include: {
          interestedMajor: { select: { id: true, name: true, label: true } },
          specificMajor: { select: { id: true, name: true, label: true } }
        }
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

// ─── Get Inquiry Status History
const getInquiryStatusHistory = async (inquiryId) => {
  const parsedId = parseInt(inquiryId, 10);
  return await prisma.inquiryStatusHistory.findMany({
    where: { inquiryId: parsedId },
    include: {
      previousStatus: {
        select: { id: true, name: true, label: true, level: true }
      },
      newStatus: {
        select: { id: true, name: true, label: true, level: true }
      },
      changedBy: {
        select: { id: true, fullName: true, email: true }
      },
      team: {
        select: { id: true, name: true }
      }
    },
    orderBy: { changedAt: 'asc' }
  });
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
  getInquiryStatusHistory,
};
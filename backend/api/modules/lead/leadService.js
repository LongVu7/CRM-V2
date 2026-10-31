const prisma = require('../../../config/db');
const { applyStatusTransition } = require('../../utils/statusTransition');
const { buildHierarchyTree } = require('../../utils/taxonomyHierarchy');
const { buildPaginationMeta } = require('../../utils/pagination');

// ─── Error factory
const handleError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// ─── Get options for lead form (sources tree & statuses tree)
const getLeadOptions = async () => {
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
const leadInclude = {
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


const buildLeadData = ({ assignedToId, createdById, sourceDataId, statusDataId, dataReceived, interactionAt, createDate, eventNames, ...rest }) => ({
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


const fetchLead = (txOrPrisma, id) =>
  txOrPrisma.lead.findUnique({
    where: { id },
    include: leadInclude
  });






// ─── Build Lead Where Clause
const buildLeadWhere = (filters, permissionScope = {}) => {
  const andClauses = [];

  if (permissionScope && Object.keys(permissionScope).length > 0) {
    andClauses.push(permissionScope);
  }

  const conditions = {};

  // Optional filter for assigned lead within authorized scope
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

// ─── List all leads
const getAllLeads = async (filters) => {
  const { page, limit, skip, permissionScope, sortField, sortOrder } = filters;
  const where = buildLeadWhere(filters, permissionScope);

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

  const [leads, totalCount] = await prisma.$transaction([
    prisma.lead.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: leadInclude
    }),
    prisma.lead.count({ where })
  ]);

  return {
    leads,
    pagination: buildPaginationMeta(page, limit, totalCount)
  };
};

// ─── Get specific lead by ID
const getLeadById = async (id) => {
  const lead = await fetchLead(prisma, parseInt(id, 10));
  if (!lead)
    throw handleError('Lead not found', 404);
  return lead;
};


/** Create lead cases:
 *   1. Create and link an existing student
 *   2. create a new lead with new student inline
 *   3. Create an lead alone
 */
const createLead = async ({ studentId, student, assignedToId, ...inquiryFields }, user) => {
  // If assignedToId is explicitly provided, parse it; otherwise keep unassigned (null)
  const targetAssignedToId = assignedToId ? parseInt(assignedToId, 10) : null;

  const leadData = buildLeadData({
    assignedToId: targetAssignedToId,
    createdById: user?.accountId || user?.id || null,
    ...inquiryFields
  });

  if (studentId) return _createWithExistingStudent(leadData, studentId, user);
  if (student?.fullName) return _createWithNewStudent(leadData, student, user);
  return _createAlone(leadData, user);
};

const _createWithExistingStudent = async (leadData, studentId, user) => {
  const sid = parseInt(studentId, 10);

  const existing = await prisma.student.findUnique({ where: { id: sid } });
  if (!existing)
    throw handleError(
      'Student not found with the provided studentId',
      404
    );

  // Check if this student is already linked to another lead
  const existingLink = await prisma.lead.findFirst({
    where: { studentId: sid }
  });
  if (existingLink) {
    throw handleError(
      `This student is already linked to another lead`,
      409
    );
  }

  // Re
  try {
    return await prisma.$transaction(async (tx) => {
      let milestoneUpdates = {};
      const statusId = leadData.statusData?.connect?.id;
      if (statusId) {
        milestoneUpdates = await applyStatusTransition({ tx, lead: {}, newStatusDataId: statusId });
      }
      const { id } = await tx.lead.create({
        data: { ...leadData, ...milestoneUpdates, student: { connect: { id: sid } } }
      });
      if (statusId) {
        await tx.leadStatusHistory.create({
          data: {
            leadId: id,
            previousStatusId: null,
            newStatusId: statusId,
            changedById: user?.accountId || null,
            teamId: null,
            notes: null,
            changedAt: new Date()
          }
        });
      }
      return fetchLead(tx, id);
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const fields = error.meta?.target || error.meta?.driverAdapterError?.cause?.constraint?.fields || [];
      let message = 'An lead with this data already exists';
      if (fields.includes('studentId') || fields.includes('student_id')) {
        message = 'This student is already linked to another lead';
      }
      const err = new Error(message);
      err.status = 409;
      throw err;
    }
    throw error;
  }
};

//Private method 
const _createWithNewStudent = async (leadData, student, user) => {
  const { specializedRegister, education, ...studentData } = student;
  try {
    return await prisma.$transaction(async (tx) => {
      let milestoneUpdates = {};
      const statusId = leadData.statusData?.connect?.id;
      if (statusId) {
        milestoneUpdates = await applyStatusTransition({ tx, lead: {}, newStatusDataId: statusId });
      }
      const { id } = await tx.lead.create({
        data: {
          ...leadData,
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
        await tx.leadStatusHistory.create({
          data: {
            leadId: id,
            previousStatusId: null,
            newStatusId: statusId,
            changedById: user?.accountId || null,
            teamId: null,
            notes: null,
            changedAt: new Date()
          }
        });
      }
      return fetchLead(tx, id);
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const fields = error.meta?.target || error.meta?.driverAdapterError?.cause?.constraint?.fields || [];
      let message = 'An lead or associated student with this data already exists';
      if (fields.includes('mobile')) {
        message = `Student with mobile "${studentData.mobile}" already exists`;
      } else if (fields.includes('studentId') || fields.includes('student_id')) {
        message = 'This student is already linked to another lead';
      }
      const err = new Error(message);
      err.status = 409;
      throw err;
    }
    throw error;
  }
};

const _createAlone = async (leadData, user) => {
  return await prisma.$transaction(async (tx) => {
    let milestoneUpdates = {};
    const statusId = leadData.statusData?.connect?.id;
    if (statusId) {
      milestoneUpdates = await applyStatusTransition({ tx, lead: {}, newStatusDataId: statusId });
    }
    const { id } = await tx.lead.create({ data: { ...leadData, ...milestoneUpdates } });
    if (statusId) {
      await tx.leadStatusHistory.create({
        data: {
          leadId: id,
          previousStatusId: null,
          newStatusId: statusId,
          changedById: user?.accountId || null,
          teamId: null,
          notes: null,
          changedAt: new Date()
        }
      });
    }
    return fetchLead(tx, id);
  });
};


// ─── Update lead
const updateLead = async (id, updateData, user) => {
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
      const currentLead = await tx.lead.findUnique({ where: { id: parseInt(id, 10) } });
      if (!currentLead) throw handleError('Lead not found', 404);

      let milestoneUpdates = {};
      const newStatusDataId = statusDataId !== undefined ? (statusDataId ? parseInt(statusDataId, 10) : null) : currentLead.statusDataId;

      if (newStatusDataId && newStatusDataId !== currentLead.statusDataId) {
        milestoneUpdates = await applyStatusTransition({
          tx,
          lead: currentLead,
          newStatusDataId
        });

        await tx.leadStatusHistory.create({
          data: {
            leadId: currentLead.id,
            previousStatusId: currentLead.statusDataId,
            newStatusId: newStatusDataId,
            changedById: user?.accountId || null,
            teamId: null,
            notes: statusNotes || null,
            changedAt: new Date()
          }
        });
      }

      return await tx.lead.update({
        where: { id: parseInt(id, 10) },
        data: { ...data, ...milestoneUpdates },
        include: leadInclude
      });
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const fields = error.meta?.target || error.meta?.driverAdapterError?.cause?.constraint?.fields || [];
      let message = 'An lead with this data already exists';
      if (fields.includes('studentId') || fields.includes('student_id')) {
        message = 'This student is already linked to another lead';
      }
      const err = new Error(message);
      err.status = 409;
      throw err;
    }
    throw error;
  }
};


// ─── Delete lead (preserves student records)
const deleteLead = async (id) => {
  const leadId = parseInt(id, 10);
  await prisma.lead.delete({ where: { id: leadId } });
};


// ─── Assign a student to an lead
const assignStudentToLead = async (leadId, studentId) => {
  const iid = parseInt(leadId, 10);
  const sid = parseInt(studentId, 10);

  const lead = await prisma.lead.findUnique({ where: { id: iid } });
  if (!lead) throw handleError('Lead not found', 404);

  const student = await prisma.student.findUnique({ where: { id: sid } });
  if (!student) throw handleError('Student not found', 404);

  // Check if this student is already linked to a different lead
  const existingLink = await prisma.lead.findFirst({
    where: { studentId: sid, id: { not: iid } }
  });
  if (existingLink) {
    throw handleError(
      `This student is already linked to another lead`,
      409
    );
  }

  try {
    await prisma.lead.update({
      where: { id: iid },
      data: { student: { connect: { id: sid } } }
    });
    return { leadId: iid, student };
  } catch (error) {
    if (error.code === 'P2002') {
      const fields = error.meta?.target || error.meta?.driverAdapterError?.cause?.constraint?.fields || [];
      let message = 'An lead with this data already exists';
      if (fields.includes('studentId') || fields.includes('student_id')) {
        message = 'This student is already linked to another lead';
      }
      const err = new Error(message);
      err.status = 409;
      throw err;
    }
    throw error;
  }
};

// ─── Unassign a student from an lead
const unassignStudentFromLead = async (leadId, studentId) => {
  const iid = parseInt(leadId, 10);
  const sid = parseInt(studentId, 10);

  const lead = await prisma.lead.findUnique({ where: { id: iid } });
  if (!lead) throw handleError('Lead not found', 404);
  if (lead.studentId !== sid) throw handleError('Student is not linked to this lead', 400);

  await prisma.lead.update({ where: { id: iid }, data: { student: { disconnect: true } } });
};

// ─── Assign an account to an lead
const assignAccountToLead = async (leadId, accountId) => {
  const iid = parseInt(leadId, 10);
  const aid = accountId ? parseInt(accountId, 10) : null;

  const currentLead = await prisma.lead.findUnique({ where: { id: iid } });
  if (!currentLead) throw handleError('Lead not found', 404);

  if (aid) {
    const account = await prisma.account.findUnique({ where: { id: aid } });
    if (!account) throw handleError('Account not found', 404);
  }

  return prisma.lead.update({
    where: { id: iid },
    data: {
      assignedToId: aid,
      updatedAt: new Date()
    },
    include: leadInclude
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
      lead: {
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

// ─── Export Leads
const exportLeads = async (filters, permissionScope = {}) => {
  const where = buildLeadWhere(filters, permissionScope);
  const leads = await prisma.lead.findMany({
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

  return leads.map(i => ({

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
    // Lead basic details
    'Description': i.description || '',
    'Data Received': i.dataReceived ? i.dataReceived.toISOString().split('T')[0] : '',
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

// ─── Get Lead Status History
const getLeadStatusHistory = async (leadId) => {
  const parsedId = parseInt(leadId, 10);
  return await prisma.leadStatusHistory.findMany({
    where: { leadId: parsedId },
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
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  assignStudentToLead,
  unassignStudentFromLead,
  assignAccountToLead,
  searchStudents,
  searchAccounts,
  exportLeads,
  getLeadOptions,
  getLeadStatusHistory,

  // Aliases for compatibility
  getAllInquiries: getAllLeads,
  getInquiryById: getLeadById,
  createInquiry: createLead,
  updateInquiry: updateLead,
  deleteInquiry: deleteLead,
  assignStudentToInquiry: assignStudentToLead,
  unassignStudentFromInquiry: unassignStudentFromLead,
  assignAccountToInquiry: assignAccountToLead,
  exportInquiries: exportLeads,
  getInquiryOptions: getLeadOptions,
  getInquiryStatusHistory: getLeadStatusHistory
};
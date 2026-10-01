const prisma = require('../../../config/db');
const { buildInquiryScope } = require('../../../authorization/scope/inquiryScope');
const { applyStatusTransition } = require('../../utils/statusTransition');
// ─── Error factory
const handleError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// ─── Shared query 
const inquiryInclude = {
  student: true,
  assignedTo: {
    select: { id: true, fullName: true, email: true }
  },
  sourceData: {
    select: { id: true, name: true, level: true }
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


const buildInquiryData = ({ assignedToId, sourceDataId, statusDataId, dataReceived, interactionAt, createDate, eventNames, ...rest }) => ({
  ...rest,
  ...(eventNames !== undefined && { eventNames: eventNames === null ? [] : eventNames }),
  ...(dataReceived !== undefined && { dataReceived: dataReceived ? new Date(dataReceived) : null }),
  ...(interactionAt !== undefined && { interactionAt: interactionAt ? new Date(interactionAt) : null }),
  ...(createDate !== undefined && { createDate: createDate ? new Date(createDate) : null }),
  ...(assignedToId !== undefined && { assignedTo: assignedToId ? { connect: { id: parseInt(assignedToId, 10) } } : { disconnect: true } }),
  ...(sourceDataId !== undefined && { sourceData: sourceDataId ? { connect: { id: parseInt(sourceDataId, 10) } } : { disconnect: true } }),
  ...(statusDataId !== undefined && { statusData: statusDataId ? { connect: { id: parseInt(statusDataId, 10) } } : { disconnect: true } })
});


const fetchInquiry = (txOrPrisma, id) =>
  txOrPrisma.inquiry.findUnique({
    where: { id },
    include: inquiryInclude
  });




const { buildPaginationMeta } = require('../../utils/pagination');

// ─── Build Inquiry Where Clause
const buildInquiryWhere = async (filters, user) => {
  const scope = await buildInquiryScope(user);
  const where = { ...scope };

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

  return where;
};

// ─── List all inquiries
const getAllInquiries = async (filters) => {
  const { page, limit, skip, user } = filters;
  const where = await buildInquiryWhere(filters, user);

  const [inquiries, totalCount] = await prisma.$transaction([
    prisma.inquiry.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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

/** Create inquiry
 *   1. Create and link an existing student
 *   2. create a new student inline
 *   3. Create with inquiry only
 */
const createInquiry = async ({ studentId, student, assignedToId, ...inquiryFields }, user) => {
  // Auto assign staff who created inquiry 
  const creatorAssignedToId = assignedToId || user.accountId;
  const inquiryData = buildInquiryData({ assignedToId: creatorAssignedToId, ...inquiryFields });

  if (studentId) return _createWithExistingStudent(inquiryData, studentId);
  if (student?.fullName) return _createWithNewStudent(inquiryData, student);
  return _createAlone(inquiryData);
};

const _createWithExistingStudent = async (inquiryData, studentId) => {
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
      if (inquiryData.statusData?.connect?.id) {
        milestoneUpdates = await applyStatusTransition({ tx, inquiry: {}, newStatusDataId: inquiryData.statusData.connect.id });
      }
      const { id } = await tx.inquiry.create({
        data: { ...inquiryData, ...milestoneUpdates, student: { connect: { id: sid } } }
      });
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
const _createWithNewStudent = async (inquiryData, student) => {
  const { specializedRegister, education, ...studentData } = student;
  try {
    return await prisma.$transaction(async (tx) => {
      let milestoneUpdates = {};
      if (inquiryData.statusData?.connect?.id) {
        milestoneUpdates = await applyStatusTransition({ tx, inquiry: {}, newStatusDataId: inquiryData.statusData.connect.id });
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

const _createAlone = async (inquiryData) => {
  return await prisma.$transaction(async (tx) => {
    let milestoneUpdates = {};
    if (inquiryData.statusData?.connect?.id) {
      milestoneUpdates = await applyStatusTransition({ tx, inquiry: {}, newStatusDataId: inquiryData.statusData.connect.id });
    }
    const { id } = await tx.inquiry.create({ data: { ...inquiryData, ...milestoneUpdates } });
    return fetchInquiry(tx, id);
  });
};


// ─── Update inquiry
const updateInquiry = async (id, updateData) => {
  const { sourceDataId, statusDataId, assignedToId, ...rest } = updateData;

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

  const account = await prisma.account.findUnique({ where: { id: aid } });
  if (!account) throw handleError('Account not found', 404);

  return prisma.inquiry.update({
    where: { id: iid },
    data: { assignedToId: aid, updatedAt: new Date() },
    include: inquiryInclude
  });
};

// ─── Search students (for assignment UI)
const searchStudents = async (query) =>
  prisma.student.findMany({
    where: {
      OR: [
        { fullName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } }
      ]
    },
    take: 20,
    orderBy: { fullName: 'asc' }
  });

// ─── Search staff accounts (for assignment UI)
const searchAccounts = async (query) =>
  prisma.account.findMany({
    where: {
      AND: [
        { isActive: true },
        {
          OR: [
            { fullName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } }
          ]
        }
      ]
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: { select: { name: true } }
    },
    take: 20,
    orderBy: { fullName: 'asc' }
  });

// ─── Export Inquiries
const exportInquiries = async (filters, user) => {
  const where = await buildInquiryWhere(filters, user);
  const inquiries = await prisma.inquiry.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      student: true,
      assignedTo: true,
      sourceData: true,
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
    'Lead Source': i.sourceData?.label || '',
    'Status General': i.statusData?.parent?.label || '',
    'Status Detail': i.statusData?.label || '',
    'Interaction Status': i.statusData?.parent?.parent?.label || '',

    // Student Details
    'Full Name': i.student?.fullName || '',
    'Gender': i.student?.gender || '',
    'Date of Birth': i.student?.birthDate ? i.student?.birthDate.toISOString().split('T')[0] : '',
    'Mobile': i.student?.mobile || '',
    'Other Phone': i.student?.otherPhone || '',
    'Email': i.student?.email || '',
    'Other Email': i.student?.otherEmail || '',
    'Parent Phone': i.student?.parentPhone || '',
    'Primary Address': i.student?.primaryAddress || '',
    'Other Phone': i.student?.otherPhone || '',
    'Other Email': i.student?.otherEmail || '',
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
  exportInquiries
};
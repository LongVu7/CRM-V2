const crypto = require('crypto');
const prisma = require('../../../config/db');
const { applyStatusTransition } = require('../../utils/statusTransition');
const { buildHierarchyTree } = require('../../utils/taxonomyHierarchy');
const { buildPaginationMeta } = require('../../utils/pagination');
const { resolveDataScope } = require('../../../config/ability');
const { capitalizeName } = require('./leadSchemas');
const { BUSINESS_TZ } = require('../../utils/reportDateUtils');

// ─── Helpers
const handleError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const handleUniqueError = (error, mobile) => {
  if (error.code === 'P2002') {
    const fields = error.meta?.target || error.meta?.driverAdapterError?.cause?.constraint?.fields || [];
    const msg = fields.includes('mobile')
      ? `A lead with mobile number "${mobile}" already exists`
      : fields.includes('studentId') || fields.includes('student_id')
        ? 'This information is already attached to another lead'
        : 'A lead with this information already exists';
    throw handleError(msg, 409);
  }
  throw error;
};

const toDate = (val) => (val ? new Date(val) : null);
const toDateStr = (date) => (date ? date.toISOString().slice(0, 10) : '');
const toInt = (val) => (val !== undefined && val !== null && val !== '' ? parseInt(val, 10) : null);

const recordAssignmentLog = async (tx, { leadId, previousAssigneeId, newAssigneeId, assignedById }) => {
  if (newAssigneeId !== previousAssigneeId) {
    await tx.leadAssignmentLog.create({
      data: {
        leadId,
        previousAssigneeId,
        newAssigneeId,
        assignedById,
        batchId: crypto.randomUUID(),
        method: 'MANUAL',
        assignedAt: new Date()
      }
    });
  }
};

const verifyAssignmentScope = async (targetAssigneeId, user) => {
  if (!targetAssigneeId) return;
  const account = await prisma.account.findUnique({ where: { id: targetAssigneeId }, select: { id: true, isActive: true } });
  if (!account || !account.isActive) throw handleError('Account not found or inactive', 404);

  if (user) {
    const { effectiveScope, authorizedAccountIds } = resolveDataScope(user, 'assign', 'lead');
    const requesterAccountId = user.accountId || user.id;

    if (effectiveScope === 'OWNER_ONLY' && targetAssigneeId !== requesterAccountId) {
      const err = handleError('You can only assign leads to yourself', 422);
      err.reason = 'INVALID_RECIPIENTS';
      throw err;
    }
    if (effectiveScope === 'TEAM_ONLY' && !authorizedAccountIds.includes(targetAssigneeId) && targetAssigneeId !== requesterAccountId) {
      const err = handleError('Target account is not within your authorized team scope', 422);
      err.reason = 'INVALID_RECIPIENTS';
      throw err;
    }
  }
};

// ─── Shared query & Formatter
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

const formatLead = (record) => {
  if (!record) return null;
  const { student, ...lead } = record;
  const education = student?.education || {};
  const register = student?.specializedRegister || {};

  return {
    ...lead,
    fullName: student?.fullName || null,
    gender: student?.gender || null,
    mobile: student?.mobile || null,
    email: student?.email ?? null,
    otherPhone: student?.otherPhone ?? null,
    birthDate: student?.birthDate || null,
    primaryAddress: student?.primaryAddress ?? null,

    schoolId: education.schoolId || null,
    oldProvinceId: education.oldProvinceId || education.school?.oldProvince?.id || null,
    newProvinceId: education.newProvinceId || null,
    countryId: education.countryId || null,
    provinceGroup: education.provinceGroup || null,
    schoolType: education.schoolType || null,
    class: education.class || null,

    interestedMajorId: register.interestedMajorId || null,
    specificMajorId: register.specificMajorId || null,
    gpa: register.gpa || null,
    englishCertificate: register.englishCertificate || null,
    programScore: register.programScore || null,
    admissionYear: register.admissionYear || null,

    student
  };
};

const fetchLead = async (txOrPrisma, id) => {
  const record = await txOrPrisma.lead.findUnique({
    where: { id },
    include: leadInclude
  });
  return formatLead(record);
};

// ─── Build Where Clause & Sorter
const SORT_FIELDS = {
  createdAt: (dir) => ({ createdAt: dir }),
  description: (dir) => ({ description: dir }),
  'assignedTo.fullName': (dir) => ({ assignedTo: { fullName: dir } }),
  'student.fullName': (dir) => ({ student: { fullName: dir } })
};

const getSortOrder = (sortField, sortOrder) => {
  const dir = parseInt(sortOrder, 10) === 1 || sortOrder === 'asc' ? 'asc' : 'desc';
  const sorter = SORT_FIELDS[sortField];
  return sorter ? sorter(dir) : { createdAt: 'desc' };
};

const buildLeadWhere = (filters, permissionScope = {}) => {
  const andClauses = [];

  if (permissionScope && Object.keys(permissionScope).length > 0) {
    andClauses.push(permissionScope);
  }

  const conditions = {};

  if (filters.unassignedOnly === true || filters.unassignedOnly === 'true') {
    conditions.assignedToId = null;
  }

  if (filters.assignedTo) {
    conditions.assignedToId = parseInt(filters.assignedTo, 10);
  }

  if (filters.statusGeneral) {
    conditions.statusData = { parent: { label: filters.statusGeneral } };
  }

  if (filters.search) {
    andClauses.push({
      OR: [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { student: { fullName: { contains: filters.search, mode: 'insensitive' } } },
        { student: { mobile: { contains: filters.search, mode: 'insensitive' } } },
        { student: { email: { contains: filters.search, mode: 'insensitive' } } }
      ]
    });
  }

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
      const pid = parseInt(filters.oldProvinceId, 10);
      conditions.student.education = {
        OR: [{ oldProvinceId: pid }, { school: { oldProvinceId: pid } }]
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

// ─── Query Operations
const getAllLeads = async (filters) => {
  const { page, limit, skip, permissionScope, sortField, sortOrder } = filters;
  const where = buildLeadWhere(filters, permissionScope);
  const orderBy = getSortOrder(sortField, sortOrder);

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
    leads: leads.map(formatLead),
    pagination: buildPaginationMeta(page, limit, totalCount)
  };
};

const getLeadById = async (id) => {
  const lead = await fetchLead(prisma, parseInt(id, 10));
  if (!lead) throw handleError('Lead not found', 404);
  return lead;
};

const getLeadOptions = async () => {
  const select = { id: true, name: true, label: true, level: true, parentId: true, sortOrder: true };
  const orderBy = { sortOrder: 'asc' };
  const [sourcesRaw, statusesRaw] = await Promise.all([
    prisma.sourceData.findMany({ where: { isActive: true }, select, orderBy }),
    prisma.statusData.findMany({ where: { isActive: true }, select, orderBy })
  ]);

  return {
    sources: buildHierarchyTree(sourcesRaw),
    statuses: buildHierarchyTree(statusesRaw)
  };
};

const searchAccounts = async (query, user) => {
  const where = { isActive: true };

  if (user) {
    const { effectiveScope, authorizedAccountIds } = resolveDataScope(user, 'assign', 'lead');
    const requesterAccountId = user.accountId || user.id;
    if (effectiveScope === 'TEAM_ONLY') {
      const allowedIds = Array.from(new Set([...authorizedAccountIds, requesterAccountId])).filter(Boolean);
      where.id = { in: allowedIds };
    } else if (effectiveScope === 'OWNER_ONLY') {
      where.id = requesterAccountId;
    }
  }

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

const exportLeads = async (filters, permissionScope = {}) => {
  const where = buildLeadWhere(filters, permissionScope);
  // Notes: in-memory excel export capped at 10k rows, move to background queue (BullMQ) if dataset grows
  const take = Math.min(parseInt(filters.limit, 10) || 10000, 10000);

  const leads = await prisma.lead.findMany({
    where,
    take,
    orderBy: { createdAt: 'desc' },
    include: leadInclude
  });

  return leads.map((i) => ({
    'Assigned Staff': i.assignedTo?.fullName || '',
    'Assigned Staff Email': i.assignedTo?.email || '',
    'Lead Source': i.sourceData?.parent?.parent?.label || '',
    'Source Detail': i.sourceData?.parent?.label || '',
    'Approach Method': i.sourceData?.label || '',
    'Interaction Status': i.statusData?.parent?.parent?.label || '',
    'Status General': i.statusData?.parent?.label || '',
    'Status Detail': i.statusData?.label || '',
    'Full Name': i.student?.fullName || '',
    'Gender': i.student?.gender || '',
    'Date of Birth': toDateStr(i.student?.birthDate),
    'Mobile': i.student?.mobile || '',
    'Other Phone': i.student?.otherPhone || '',
    'Email': i.student?.email || '',
    'Primary Address': i.student?.primaryAddress || '',
    'School': i.student?.education?.school?.name || '',
    'Old Province': i.student?.education?.oldProvince?.name || '',
    'Class': i.student?.education?.class || '',
    'Interested Major': i.student?.specializedRegister?.interestedMajor?.label || '',
    'Specific Major': i.student?.specializedRegister?.specificMajor?.label || '',
    'GPA': i.student?.specializedRegister?.gpa || '',
    'English Certificate': i.student?.specializedRegister?.englishCertificate || '',
    'Description': i.description || '',
    'Data Received': toDateStr(i.dataReceived),
    'Interaction At': toDateStr(i.interactionAt),
    'Call Count': i.callCount || 0,
    'Event Names': i.eventNames?.length > 0 ? i.eventNames.join(', ') : '',
    'Call Log': i.callLog || '',
    'Compensation Status': i.compensationStatus || '',
    'Priority': i.priority || '',
    'Create Date': toDateStr(i.createDate),
    'Created At': toDateStr(i.createdAt),
    'First Processed At': toDateStr(i.firstProcessedAt),
    'First Interacted At': toDateStr(i.firstInteractedAt),
    'NB At': toDateStr(i.nbAt),
    'Updated At': toDateStr(i.updatedAt)
  }));
};

const getLeadStatusHistory = async (leadId) => {
  const parsedId = parseInt(leadId, 10);
  return prisma.leadStatusHistory.findMany({
    where: { leadId: parsedId },
    include: {
      previousStatus: { select: { id: true, name: true, label: true, level: true } },
      newStatus: { select: { id: true, name: true, label: true, level: true } },
      changedBy: { select: { id: true, fullName: true, email: true } },
      team: { select: { id: true, name: true } }
    },
    orderBy: { changedAt: 'asc' }
  });
};

// ─── Mutation Operations
const createLead = async (payload, user) => {
  const {
    fullName, gender, mobile, email, otherPhone, birthDate, primaryAddress,
    oldProvinceId, schoolId, newProvinceId, countryId, provinceGroup, schoolType, class: studentClass,
    interestedMajorId, specificMajorId, admissionYear, englishCertificate, gpa, programScore,
    sourceDataId, statusDataId, assignedToId, dataReceived, description, priority,
    createDate, interactionAt, callCount, compensationStatus, eventNames, callLog, recordFile
  } = payload;

  if (!fullName?.trim() || !mobile?.trim() || !gender) {
    throw handleError('Please fill in all required fields to create a lead', 400);
  }

  const targetAssignedToId = toInt(assignedToId);
  const targetSourceDataId = toInt(sourceDataId);
  const targetStatusDataId = toInt(statusDataId);

  const leadData = {
    description,
    priority,
    callCount,
    compensationStatus,
    callLog,
    recordFile,
    eventNames: eventNames === null ? [] : eventNames,
    dataReceived: toDate(dataReceived),
    interactionAt: toDate(interactionAt),
    createDate: toDate(createDate),
    ...(targetAssignedToId && { assignedTo: { connect: { id: targetAssignedToId } } }),
    ...(user?.accountId || user?.id ? { createdBy: { connect: { id: user.accountId || user.id } } } : {}),
    ...(targetSourceDataId && { sourceData: { connect: { id: targetSourceDataId } } }),
    ...(targetStatusDataId && { statusData: { connect: { id: targetStatusDataId } } })
  };

  const studentData = {
    fullName: capitalizeName(fullName),
    gender,
    mobile,
    email: email || null,
    otherPhone: otherPhone || null,
    birthDate: toDate(birthDate),
    primaryAddress: primaryAddress || null
  };

  const educationData = (schoolId || oldProvinceId || newProvinceId || countryId || provinceGroup || schoolType || studentClass) ? {
    schoolId: toInt(schoolId),
    oldProvinceId: toInt(oldProvinceId),
    newProvinceId: toInt(newProvinceId),
    countryId: toInt(countryId) || 1,
    provinceGroup: provinceGroup || 'OTHER_PROVINCE',
    schoolType: schoolType || 'NONE',
    class: studentClass || 'NONE'
  } : null;

  const registerData = (interestedMajorId || specificMajorId || admissionYear || englishCertificate || gpa || programScore) ? {
    interestedMajorId: toInt(interestedMajorId) || 1,
    specificMajorId: toInt(specificMajorId) || 1,
    admissionYear: toInt(admissionYear),
    englishCertificate: englishCertificate || null,
    gpa: gpa || 'OTHER',
    programScore: programScore || 'NOT_ELIGIBLE'
  } : null;

  try {
    return await prisma.$transaction(async (tx) => {
      let milestoneUpdates = {};
      if (targetStatusDataId) {
        milestoneUpdates = await applyStatusTransition({ tx, lead: {}, newStatusDataId: targetStatusDataId });
      }

      const { id } = await tx.lead.create({
        data: {
          ...leadData,
          ...milestoneUpdates,
          student: {
            create: {
              ...studentData,
              ...(educationData && { education: { create: educationData } }),
              ...(registerData && { specializedRegister: { create: registerData } })
            }
          }
        }
      });

      if (targetStatusDataId) {
        await tx.leadStatusHistory.create({
          data: {
            leadId: id,
            previousStatusId: null,
            newStatusId: targetStatusDataId,
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
    handleUniqueError(error, mobile);
  }
};

const updateLead = async (id, payload, user) => {
  const {
    fullName, gender, mobile, email, otherPhone, birthDate, primaryAddress,
    oldProvinceId, schoolId, newProvinceId, countryId, provinceGroup, schoolType, class: studentClass,
    interestedMajorId, specificMajorId, admissionYear, englishCertificate, gpa, programScore,
    sourceDataId, statusDataId, assignedToId, statusNotes, dataReceived, description,
    priority, createDate, interactionAt, callCount, compensationStatus, eventNames, callLog, recordFile
  } = payload;

  const leadId = parseInt(id, 10);
  const targetAssignedToId = assignedToId !== undefined ? toInt(assignedToId) : undefined;
  const targetSourceDataId = sourceDataId !== undefined ? toInt(sourceDataId) : undefined;
  const targetStatusDataId = statusDataId !== undefined ? toInt(statusDataId) : undefined;

  const data = {
    updatedAt: new Date(),
    ...(description !== undefined && { description }),
    ...(callLog !== undefined && { callLog }),
    ...(recordFile !== undefined && { recordFile }),
    ...(priority !== undefined && { priority }),
    ...(callCount !== undefined && { callCount }),
    ...(compensationStatus !== undefined && { compensationStatus }),
    ...(eventNames !== undefined && { eventNames: eventNames === null ? [] : eventNames }),
    ...(dataReceived !== undefined && { dataReceived: toDate(dataReceived) }),
    ...(createDate !== undefined && { createDate: toDate(createDate) }),
    ...(interactionAt !== undefined && { interactionAt: toDate(interactionAt) }),
    ...(targetAssignedToId !== undefined && (targetAssignedToId ? { assignedTo: { connect: { id: targetAssignedToId } } } : { assignedTo: { disconnect: true } })),
    ...(targetSourceDataId !== undefined && (targetSourceDataId ? { sourceData: { connect: { id: targetSourceDataId } } } : { sourceData: { disconnect: true } })),
    ...(targetStatusDataId !== undefined && (targetStatusDataId ? { statusData: { connect: { id: targetStatusDataId } } } : { statusData: { disconnect: true } }))
  };

  try {
    return await prisma.$transaction(async (tx) => {
      const currentLead = await tx.lead.findUnique({
        where: { id: leadId },
        include: {
          student: {
            include: {
              education: true,
              specializedRegister: true
            }
          }
        }
      });
      if (!currentLead) throw handleError('Lead not found', 404);

      if (targetAssignedToId !== undefined && targetAssignedToId !== currentLead.assignedToId) {
        await verifyAssignmentScope(targetAssignedToId, user);
        await recordAssignmentLog(tx, {
          leadId,
          previousAssigneeId: currentLead.assignedToId,
          newAssigneeId: targetAssignedToId,
          assignedById: user?.accountId || user?.id || null
        });
      }

      let milestoneUpdates = {};
      const newStatusDataId = targetStatusDataId !== undefined ? targetStatusDataId : currentLead.statusDataId;
      if (newStatusDataId && newStatusDataId !== currentLead.statusDataId) {
        milestoneUpdates = await applyStatusTransition({ tx, lead: currentLead, newStatusDataId });
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

      await tx.lead.update({
        where: { id: leadId },
        data: { ...data, ...milestoneUpdates }
      });

      const hasContactUpdates = fullName !== undefined || gender !== undefined || mobile !== undefined || email !== undefined || otherPhone !== undefined || birthDate !== undefined || primaryAddress !== undefined;
      const hasEducationUpdates = schoolId !== undefined || oldProvinceId !== undefined || newProvinceId !== undefined || countryId !== undefined || provinceGroup !== undefined || schoolType !== undefined || studentClass !== undefined;
      const hasRegisterUpdates = interestedMajorId !== undefined || specificMajorId !== undefined || admissionYear !== undefined || englishCertificate !== undefined || gpa !== undefined || programScore !== undefined;

      if (currentLead.studentId) {
        if (hasContactUpdates) {
          await tx.student.update({
            where: { id: currentLead.studentId },
            data: {
              updatedAt: new Date(),
              ...(fullName !== undefined && { fullName: capitalizeName(fullName) }),
              ...(gender !== undefined && { gender }),
              ...(mobile !== undefined && { mobile }),
              ...(email !== undefined && { email: email || null }),
              ...(otherPhone !== undefined && { otherPhone: otherPhone || null }),
              ...(birthDate !== undefined && { birthDate: toDate(birthDate) }),
              ...(primaryAddress !== undefined && { primaryAddress: primaryAddress || null })
            }
          });
        }

        if (hasEducationUpdates) {
          const educationPayload = {
            ...(schoolId !== undefined && { schoolId: toInt(schoolId) }),
            ...(oldProvinceId !== undefined && { oldProvinceId: toInt(oldProvinceId) }),
            ...(newProvinceId !== undefined && { newProvinceId: toInt(newProvinceId) }),
            ...(countryId !== undefined && { countryId: toInt(countryId) || 1 }),
            ...(provinceGroup !== undefined && { provinceGroup }),
            ...(schoolType !== undefined && { schoolType }),
            ...(studentClass !== undefined && { class: studentClass }),
            updatedAt: new Date()
          };

          await tx.studentEducation.upsert({
            where: { studentId: currentLead.studentId },
            create: {
              studentId: currentLead.studentId,
              countryId: toInt(countryId) || 1,
              provinceGroup: provinceGroup || 'OTHER_PROVINCE',
              schoolType: schoolType || 'NONE',
              class: studentClass || 'NONE',
              ...educationPayload
            },
            update: educationPayload
          });
        }

        if (hasRegisterUpdates) {
          const registerPayload = {
            ...(interestedMajorId ? { interestedMajorId: parseInt(interestedMajorId, 10) } : {}),
            ...(specificMajorId ? { specificMajorId: parseInt(specificMajorId, 10) } : {}),
            ...(admissionYear !== undefined && { admissionYear: toInt(admissionYear) }),
            ...(englishCertificate !== undefined && { englishCertificate: englishCertificate || null }),
            ...(gpa !== undefined && { gpa }),
            ...(programScore !== undefined && { programScore }),
            updatedAt: new Date()
          };

          if (currentLead.student?.specializedRegisterId) {
            await tx.specializedRegister.update({
              where: { id: currentLead.student.specializedRegisterId },
              data: registerPayload
            });
          } else if (interestedMajorId && specificMajorId) {
            const newRegister = await tx.specializedRegister.create({
              data: {
                interestedMajorId: parseInt(interestedMajorId, 10),
                specificMajorId: parseInt(specificMajorId, 10),
                gpa: gpa || 'OTHER',
                programScore: programScore || 'NOT_ELIGIBLE',
                admissionYear: toInt(admissionYear),
                englishCertificate: englishCertificate || null
              }
            });
            await tx.student.update({
              where: { id: currentLead.studentId },
              data: { specializedRegisterId: newRegister.id }
            });
          }
        }
      }

      return fetchLead(tx, leadId);
    });
  } catch (error) {
    handleUniqueError(error, mobile);
  }
};

const deleteLead = async (id) => {
  const leadId = parseInt(id, 10);
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      studentId: true,
      student: { select: { id: true, specializedRegisterId: true } }
    }
  });

  if (!lead) throw handleError('Lead not found', 404);

  await prisma.$transaction(async (tx) => {
    await tx.lead.delete({ where: { id: leadId } });

    if (lead.student) {
      await tx.student.delete({ where: { id: lead.student.id } });

      if (lead.student.specializedRegisterId) {
        await tx.specializedRegister.delete({
          where: { id: lead.student.specializedRegisterId }
        });
      }
    }
  });
};

const assignAccountToLead = async (leadId, accountId, user) => {
  const lid = parseInt(leadId, 10);
  const aid = toInt(accountId);

  const currentLead = await prisma.lead.findUnique({ where: { id: lid } });
  if (!currentLead) throw handleError('Lead not found', 404);

  await verifyAssignmentScope(aid, user);

  return prisma.$transaction(async (tx) => {
    const updatedLead = await tx.lead.update({
      where: { id: lid },
      data: {
        assignedToId: aid,
        updatedAt: new Date()
      },
      include: leadInclude
    });

    await recordAssignmentLog(tx, {
      leadId: lid,
      previousAssigneeId: currentLead.assignedToId,
      newAssigneeId: aid,
      assignedById: user?.accountId || user?.id || null
    });

    return formatLead(updatedLead);
  });
};

const getCreatedLeadStats = async (accountId) => {
  const aid = parseInt(accountId, 10);
  if (!aid || isNaN(aid)) return { today: 0, this_week: 0, this_month: 0, total: 0 };

  const [stats] = await prisma.$queryRaw`
    SELECT
      COUNT(*) FILTER (WHERE created_at >= date_trunc('day', NOW() AT TIME ZONE ${BUSINESS_TZ}) AT TIME ZONE ${BUSINESS_TZ})::int AS today,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('week', NOW() AT TIME ZONE ${BUSINESS_TZ}) AT TIME ZONE ${BUSINESS_TZ})::int AS this_week,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW() AT TIME ZONE ${BUSINESS_TZ}) AT TIME ZONE ${BUSINESS_TZ})::int AS this_month,
      COUNT(*)::int AS total
    FROM lead
    WHERE created_by_id = ${aid}
  `;
  return stats || { today: 0, this_week: 0, this_month: 0, total: 0 };
};

module.exports = {
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  assignAccountToLead,
  searchAccounts,
  exportLeads,
  getLeadOptions,
  getLeadStatusHistory,
  getCreatedLeadStats
};
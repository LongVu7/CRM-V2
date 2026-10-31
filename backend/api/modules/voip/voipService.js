const prisma = require('../../../config/db');
const { generateStringeeToken } = require('../../../config/stringee');
const { subject } = require('@casl/ability');

/**
 * Normalizes phone number into E.164 format without leading '+'
 * e.g., '0912345678' -> '84912345678'
 */
const normalizePhoneNumber = (phone) => {
  if (!phone) return null;
  let digits = String(phone).trim().replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = '84' + digits.slice(1);
  }
  return digits;
};

/**
 * Generate Stringee access token for an authenticated staff account
 */
const getStaffToken = async (account) => {
  const userId = `staff_${account.id}`;
  return generateStringeeToken(userId);
};

/**
 * Check the validation whether an inquiry can be called by the requesting user (Assigned to student)  
 */
const checkCallReadiness = async (inquiryId, user, ability) => {
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: Number(inquiryId) },
    include: {
      student: true,
      assignedTo: { select: { id: true, fullName: true, email: true } }
    }
  });

  if (!inquiry) {
    return { canCall: false, reason: 'INQUIRY_NOT_FOUND', message: 'Inquiry not found' };
  }

  // 1. Authorization check:
  // User can call if they are the direct assignee OR they have read permissions on inquiry
  const isAssignee = inquiry.assignedToId === user.id;
  const hasInquiryAccess = ability ? ability.can('read', subject('inquiry', inquiry)) : true;

  if (!isAssignee && !hasInquiryAccess) {
    return {
      canCall: false,
      reason: 'UNAUTHORIZED_CALLER',
      message: 'You do not have permission to place calls for this inquiry.'
    };
  }

  // 2. Student presence check:
  if (!inquiry.student) {
    return {
      canCall: false,
      reason: 'NO_STUDENT_LINKED',
      message: 'No prospective student is currently associated with this inquiry.'
    };
  }

  // 3. Phone number validation:
  const primaryPhone = inquiry.student.mobile;
  const otherPhone = inquiry.student.otherPhone;
  const normalizedPrimary = normalizePhoneNumber(primaryPhone);
  const normalizedOther = normalizePhoneNumber(otherPhone);

  if (!normalizedPrimary && !normalizedOther) {
    return {
      canCall: false,
      reason: 'NO_STUDENT_PHONE',
      message: 'The associated student does not have a valid phone number.'
    };
  }

  return {
    canCall: true,
    inquiryId: inquiry.id,
    isAssignee,
    student: {
      id: inquiry.student.id,
      fullName: inquiry.student.fullName,
      primaryPhone,
      normalizedPhone: normalizedPrimary,
      otherPhone,
      normalizedOtherPhone: normalizedOther,
      targetUserId: normalizedPrimary || normalizedOther
    }
  };
};

/**
 * Creates a call log record
 */
const createCallRecord = async (payload, handledById) => {
  return prisma.call.create({
    data: {
      stringeeCallId: payload.stringeeCallId || null,
      direction: payload.direction || 'OUTBOUND',
      status: 'INITIATING',
      callerId: payload.callerId,
      calleeId: payload.calleeId,
      destinationNumber: payload.destinationNumber || null,
      handledById: Number(handledById),
      inquiryId: payload.inquiryId ? Number(payload.inquiryId) : null,
      studentId: payload.studentId ? Number(payload.studentId) : null
    },
    include: {
      handledBy: { select: { id: true, fullName: true, email: true } }
    }
  });
};

/**
 * Updates a call log record upon hangup or conclusion
 */
const updateCallRecord = async (callId, payload) => {
  const updateData = {};

  if (payload.stringeeCallId) 
    updateData.stringeeCallId = payload.stringeeCallId;
  if (payload.status) 
    updateData.status = payload.status;
  if (payload.durationSeconds !== undefined) 
    updateData.durationSeconds = payload.durationSeconds;
  if (payload.answeredAt) 
    updateData.answeredAt = new Date(payload.answeredAt);
  if (payload.endedAt) 
    updateData.endedAt = new Date(payload.endedAt);
  if (payload.disposition) 
    updateData.disposition = payload.disposition;
  if (payload.note !== undefined) 
    updateData.note = payload.note;

  return prisma.call.update({
    where: { id: Number(callId) },
    data: updateData,
    include: {
      handledBy: { select: { id: true, fullName: true, email: true } }
    }
  });
};

/**
 * Retrieves past call history for an inquiry
 */
const getInquiryCallHistory = async (inquiryId) => {
  return prisma.call.findMany({
    where: { inquiryId: Number(inquiryId) },
    include: {
      handledBy: { select: { id: true, fullName: true, email: true } }
    },
    orderBy: { startedAt: 'desc' }
  });
};

/**
 * Retrieves paginated call history across the CRM with optional filters
 */
const getAllCalls = async ({ page = 1, limit = 15, search = '', status, disposition } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
  const skip = (pageNum - 1) * limitNum;

  const where = {};
  if (status) {
    where.status = status;
  }
  if (disposition) {
    where.disposition = disposition;
  }
  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { destinationNumber: { contains: s, mode: 'insensitive' } },
      { note: { contains: s, mode: 'insensitive' } },
      { student: { fullName: { contains: s, mode: 'insensitive' } } },
      { handledBy: { fullName: { contains: s, mode: 'insensitive' } } }
    ];
  }

  const [calls, totalCount] = await Promise.all([
    prisma.call.findMany({
      where,
      include: {
        handledBy: { select: { id: true, fullName: true, email: true } },
        student: { select: { id: true, fullName: true, mobile: true } },
        inquiry: { select: { id: true } }
      },
      orderBy: { startedAt: 'desc' },
      skip,
      take: limitNum
    }),
    prisma.call.count({ where })
  ]);

  return {
    calls,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum)
    }
  };
};

module.exports = {
  normalizePhoneNumber,
  getStaffToken,
  checkCallReadiness,
  createCallRecord,
  updateCallRecord,
  getInquiryCallHistory,
  getAllCalls
};

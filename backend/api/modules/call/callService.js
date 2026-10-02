const prisma = require('../../../config/db');
const { isValidTransition, isTerminal } = require('./callStateMachine');
const { CallStatus } = require('@prisma/client');
const crypto = require('crypto');
const { normalizePhoneNumber } = require('../../utils/phoneUtils');

const handleError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const createCall = async (data) => {
  const { direction, callerNumber, destinationNumber, handledById, studentId, inquiryId } = data;
  
  const correlationId = crypto.randomUUID();

  return await prisma.call.create({
    data: {
      direction,
      status: CallStatus.INITIATING,
      callerNumber,
      destinationNumber,
      handledById,
      studentId,
      inquiryId,
      correlationId,
      startedAt: new Date()
    }
  });
};

const updateStatus = async (correlationId, nextState, dispositionId = null, notes = null) => {
  const call = await prisma.call.findUnique({ where: { correlationId } });
  if (!call) throw handleError('Call not found', 404);

  if (isTerminal(call.status)) {
    throw handleError(`Cannot transition from terminal state: ${call.status}`, 400);
  }

  if (!isValidTransition(call.status, nextState, call.direction)) {
    throw handleError(`Invalid transition from ${call.status} to ${nextState} for ${call.direction} call`, 400);
  }

  const updates = { status: nextState, updatedAt: new Date() };

  if (dispositionId) {
    updates.dispositionId = parseInt(dispositionId, 10);
  }
  if (notes !== null) {
    updates.notes = notes;
  }

  if (nextState === CallStatus.CONNECTED && call.status !== CallStatus.ON_HOLD) {
    updates.answeredAt = new Date();
  }
  if (isTerminal(nextState)) {
    updates.endedAt = new Date();
    if (updates.answeredAt || call.answeredAt) {
      const answeredTime = updates.answeredAt || call.answeredAt;
      updates.durationSeconds = Math.floor((updates.endedAt.getTime() - answeredTime.getTime()) / 1000);
    }
  }

  return await prisma.call.update({
    where: { correlationId },
    data: updates
  });
};

const matchCaller = async (incomingNumber) => {
  const normalized = normalizePhoneNumber(incomingNumber);
  if (!normalized) return [];

  const localNumberPattern = normalized.replace('+84', '').replace(/^0+/, '');

  return await prisma.student.findMany({
    where: {
      OR: [
        { mobile: { endsWith: localNumberPattern } },
        { otherPhone: { endsWith: localNumberPattern } }
      ]
    },
    select: {
      id: true,
      fullName: true,
      mobile: true,
      otherPhone: true
    }
  });
};

const updateCall = async (correlationId, data) => {
  const { notes, dispositionId, studentId, inquiryId } = data;
  const updates = {};
  if (notes !== undefined) updates.notes = notes;
  if (dispositionId !== undefined) updates.dispositionId = dispositionId ? parseInt(dispositionId, 10) : null;
  if (studentId !== undefined) updates.studentId = studentId ? parseInt(studentId, 10) : null;
  if (inquiryId !== undefined) updates.inquiryId = inquiryId ? parseInt(inquiryId, 10) : null;

  return await prisma.call.update({
    where: { correlationId },
    data: updates
  });
};

const finalizeCall = async (correlationId) => {
  return await prisma.call.update({
    where: { correlationId },
    data: { finalizedAt: new Date() }
  });
};

const getAllCalls = async (filters) => {
  const { page = 1, limit = 20, studentId, inquiryId, accountId } = filters;
  const skip = (page - 1) * limit;

  const where = {};
  if (studentId) where.studentId = parseInt(studentId, 10);
  if (inquiryId) where.inquiryId = parseInt(inquiryId, 10);
  if (accountId) where.handledById = parseInt(accountId, 10);

  const [calls, totalCount] = await prisma.$transaction([
    prisma.call.findMany({
      where,
      skip,
      take: parseInt(limit, 10),
      orderBy: { startedAt: 'desc' },
      include: {
        disposition: true,
        handledBy: { select: { id: true, fullName: true } }
      }
    }),
    prisma.call.count({ where })
  ]);

  return { calls, totalCount };
};

module.exports = {
  createCall,
  updateStatus,
  matchCaller,
  updateCall,
  finalizeCall,
  getAllCalls
};

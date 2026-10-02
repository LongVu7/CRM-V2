const { z } = require('zod');
const { CallDirection } = require('@prisma/client');

const createCallSchema = z.object({
  direction: z.enum([CallDirection.INBOUND, CallDirection.OUTBOUND]),
  callerNumber: z.string().min(1, 'Caller number is required'),
  destinationNumber: z.string().min(1, 'Destination number is required'),
  studentId: z.number().int().positive().optional().nullable(),
  inquiryId: z.number().int().positive().optional().nullable(),
});

module.exports = {
  createCallSchema
};

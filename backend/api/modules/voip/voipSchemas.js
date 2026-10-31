const { z } = require('zod');

const createCallSchema = z.object({
  stringeeCallId: z.string().max(100).optional(),
  direction: z.enum(['INBOUND', 'OUTBOUND']).default('OUTBOUND'),
  callerId: z.string().max(100),
  calleeId: z.string().max(100),
  destinationNumber: z.string().max(50).optional(),
  leadId: z.number().int().positive().optional(),
  inquiryId: z.number().int().positive().optional(),
  studentId: z.number().int().positive().optional()
}).strict().transform(data => ({
  ...data,
  leadId: data.leadId || data.inquiryId,
  inquiryId: data.leadId || data.inquiryId
}));

const updateCallSchema = z.object({
  stringeeCallId: z.string().max(100).optional(),
  status: z.enum(['INITIATING', 'RINGING', 'CONNECTED', 'COMPLETED', 'BUSY', 'NO_ANSWER', 'FAILED']).optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  answeredAt: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: 'Must be a valid date string'
  }),
  endedAt: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: 'Must be a valid date string'
  }),
  disposition: z.string().max(50).optional(),
  note: z.string().max(5000).optional()
}).strict();

module.exports = {
  createCallSchema,
  updateCallSchema
};

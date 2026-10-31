const { z } = require('zod');
const { createStudentSchema } = require('../student/studentSchemas');

const dateString = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Must be a valid date string'
});

const { 
  EventName,
  CompensationStatus,
  Priority
} = require('@prisma/client');

const leadFields = {
  statusDataId: z.number().int('statusDataId must be an integer').optional(),
  description: z.string().optional(),
  dataReceived: dateString.optional(),
  assignedToId: z.number().int('assignedToId must be an integer').optional(),
  sourceDataId: z.number().int('sourceDataId must be an integer').optional(),
  studentId: z.number().int('studentId must be an integer').optional(),
  student: createStudentSchema.optional(),
  createDate: dateString.optional(),
  interactionAt: dateString.optional(),
  callCount: z.number().int().min(1).max(10).optional(),
  eventNames: z.array(z.enum(EventName)).optional(),
  callLog: z.string().max(5000).optional(),
  recordFile: z.string().optional(),
  compensationStatus: z.enum(CompensationStatus).optional(),
  priority: z.enum(Priority).optional()
};

const createLeadSchema = z.object(leadFields).strict();

const updateLeadSchema = z.object({
  statusDataId: z.number().int().nullable().optional(),
  description: leadFields.description,
  dataReceived: dateString.nullable().optional(),
  assignedToId: z.number().int().nullable().optional(),
  sourceDataId: z.number().int().nullable().optional(),
  createDate: dateString.nullable().optional(),
  interactionAt: dateString.nullable().optional(),
  callCount: z.number().int().min(1).max(10).nullable().optional(),
  eventNames: z.array(z.enum(EventName)).nullable().optional(),
  callLog: z.string().max(5000).nullable().optional(),
  recordFile: z.string().nullable().optional(),
  compensationStatus: z.enum(CompensationStatus).nullable().optional(),
  priority: z.enum(Priority).nullable().optional(),
  statusNotes: z.string().max(2000, 'Notes cannot exceed 2000 characters').nullable().optional()
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'Request body cannot be empty'
});

const assignStudentSchema = z.object({
  studentId: z.number().int('studentId must be an integer')
}).strict();

const assignAccountSchema = z.object({
  accountId: z.number().int('accountId must be an integer')
}).strict();

const { capitalizeName } = require('../student/studentSchemas');

const sanitizeSheetMobile = (val) => {
  if (val === undefined || val === null || val === '') return undefined;
  let str = String(val).trim();
  if (!str) return undefined;
  let cleaned = str.replace(/\D/g, '');
  if (cleaned.startsWith('84') && cleaned.length === 11) {
    cleaned = '0' + cleaned.slice(2);
  } else if (cleaned.length === 9 && !cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
};

const sheetMobileSchema = z.preprocess(
  sanitizeSheetMobile,
  z.string({ required_error: 'Mobile is required' })
    .regex(/^0\d{9}$/, 'Phone format is incorrect (10-digit, start with 0)')
);

const sheetFullNameSchema = z.string({
  required_error: 'Full Name is required',
  invalid_type_error: 'Full Name must be a string'
})
  .trim()
  .min(1, 'Full Name is required')
  .max(255)
  .transform(capitalizeName);

const sheetLeadSyncSchema = z.object({
  fullName: sheetFullNameSchema,
  mobile: sheetMobileSchema,
  email: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()),
    z.email('Email format is incorrect').max(255).optional()
  ),
  otherPhone: z.preprocess(
    sanitizeSheetMobile,
    z.string().regex(/^0\d{9}$/, 'Phone format is incorrect (10-digit, start with 0)').optional()
  ),
  primaryAddress: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()),
    z.string().max(255).optional()
  ),
  oldProvince: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()),
    z.string().max(255).optional()
  ),
  school: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()),
    z.string().max(255).optional()
  ),
  specificMajor: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()),
    z.string().max(255).optional()
  ),
  interestedMajor: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()),
    z.string().max(255).optional()
  ),
  source: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()),
    z.string().max(100).optional()
  ),
  sourceDetail: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()),
    z.string().max(255).optional()
  ),
  approachMethod: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()),
    z.string().max(255).optional()
  ),
  class: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : String(val).trim()),
    z.string().max(50).optional()
  )
}).loose();

const { SLA_TIERS } = require('../../utils/slaTier');

const poolQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  sourceId: z.coerce.number().int().positive().optional(),
  slaTier: z.enum([
    SLA_TIERS.NORMAL,
    SLA_TIERS.ATTENTION,
    SLA_TIERS.WARNING,
    SLA_TIERS.OVERDUE
  ]).optional(),
  sortField: z.enum(['createdAt', 'student.fullName']).default('createdAt'),
  sortOrder: z.coerce.number().refine(val => val === 1 || val === -1, {
    message: 'sortOrder must be 1 or -1'
  }).default(-1)
});

const recipientsQuerySchema = z.object({
  scope: z.enum(['ALL', 'TEAM', 'NO_TEAM', 'SELF']).optional(),
  teamId: z.coerce.number().int().positive().optional()
});

const distributionRequestSchema = z.object({
  leadIds: z.array(z.number().int().positive()).min(1).max(500).optional(),
  inquiryIds: z.array(z.number().int().positive()).min(1).max(500).optional(),
  staffIds: z.array(z.number().int().positive()).min(1).max(100),
  teamId: z.number().int().positive().nullable().optional(),
  scope: z.object({
    type: z.string().optional(),
    teamId: z.number().int().positive().nullable().optional()
  }).optional(),
  method: z.literal('ROUND_ROBIN').default('ROUND_ROBIN')
}).refine(data => (data.leadIds && data.leadIds.length > 0) || (data.inquiryIds && data.inquiryIds.length > 0), {
  message: 'leadIds or inquiryIds must be provided and not empty'
}).transform(data => {
  const ids = data.leadIds || data.inquiryIds || [];
  const uniqueLeadIds = [...new Set(ids)];
  const uniqueStaffIds = [...new Set(data.staffIds)];

  return {
    ...data,
    leadIds: uniqueLeadIds,
    inquiryIds: uniqueLeadIds,
    staffIds: uniqueStaffIds,
    teamId: data.teamId ?? data.scope?.teamId ?? null
  };
});

module.exports = {
  createLeadSchema,
  updateLeadSchema,
  createInquirySchema: createLeadSchema,
  updateInquirySchema: updateLeadSchema,
  assignStudentSchema,
  assignAccountSchema,
  sheetLeadSyncSchema,
  sheetInquirySyncSchema: sheetLeadSyncSchema,
  sanitizeSheetMobile,
  poolQuerySchema,
  recipientsQuerySchema,
  distributionRequestSchema,
  leadFields,
  inquiryFields: leadFields
};

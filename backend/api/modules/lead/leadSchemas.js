const { z } = require('zod');

const dateString = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Must be a valid date string'
});

const {
  EventName,
  CompensationStatus,
  Priority,
  ProvinceGroup,
  StudentClass,
  SchoolType,
  EnglishCertificate,
  GPA,
  ProgramScore
} = require('@prisma/client');

const capitalizeName = (str) => {
  if (typeof str !== 'string' || !str.trim()) return str;
  return str.trim().split(/\s+/).map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

const mobileString = z.preprocess(
  (val) => (val === '' || val === null ? undefined : val),
  z.string({ required_error: 'Mobile is required' })
    .length(10, 'Mobile number must be exactly 10 digits long')
    .startsWith('0', 'Mobile number must start with 0')
    .regex(/^\d+$/, 'Mobile number must contain only numbers')
);

const optionalMobileString = z.preprocess(
  (val) => (val === '' || val === null ? null : val),
  z.string()
    .length(10, 'Mobile number must be exactly 10 digits long')
    .startsWith('0', 'Mobile number must start with 0')
    .regex(/^\d+$/, 'Mobile number must contain only numbers')
    .nullable()
    .optional()
);

const optionalOtherPhoneString = z.preprocess(
  (val) => (val === '' || val === null ? null : val),
  z.string()
    .length(10, 'Other phone number must be exactly 10 digits long')
    .startsWith('0', 'Other phone number must start with 0')
    .regex(/^\d+$/, 'Other phone number must contain only numbers')
    .nullable()
    .optional()
);

const fullNameSchema = z.string({
  required_error: 'Full Name is required',
  invalid_type_error: 'Full Name must be a string'
})
  .trim()
  .min(1, 'Full Name is required')
  .max(255)
  .transform(capitalizeName);

const leadFields = {
  fullName: fullNameSchema,
  gender: z.string({ required_error: 'Gender is required' }).trim().min(1, 'Gender is required').max(20),
  mobile: mobileString,
  email: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : val),
    z.string().email('Email format is incorrect').max(255).nullable().optional()
  ),
  otherPhone: optionalOtherPhoneString,
  birthDate: dateString.nullable().optional(),
  primaryAddress: z.preprocess(
    (val) => (val === '' || val === null ? null : val),
    z.string().max(255).nullable().optional()
  ),

  oldProvinceId: z.number().int().positive().nullable().optional(),
  schoolId: z.number().int().positive().nullable().optional(),
  newProvinceId: z.number().int().positive().nullable().optional(),
  countryId: z.number().int().positive().nullable().optional(),
  provinceGroup: z.enum(ProvinceGroup).nullable().optional(),
  schoolType: z.enum(SchoolType).nullable().optional(),
  class: z.enum(StudentClass).nullable().optional(),

  interestedMajorId: z.number().int().positive().nullable().optional(),
  specificMajorId: z.number().int().positive().nullable().optional(),
  admissionYear: z.preprocess(
    (val) => (val === '' || val === null ? null : (val === undefined ? undefined : Number(val))),
    z.number().int().nullable().optional()
  ),
  englishCertificate: z.enum(EnglishCertificate).nullable().optional(),
  gpa: z.enum(GPA).nullable().optional(),
  programScore: z.enum(ProgramScore).nullable().optional(),

  statusDataId: z.number().int('statusDataId must be an integer').nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  dataReceived: dateString.nullable().optional(),
  assignedToId: z.number().int('assignedToId must be an integer').nullable().optional(),
  sourceDataId: z.number().int('sourceDataId must be an integer').nullable().optional(),
  createDate: dateString.nullable().optional(),
  interactionAt: dateString.nullable().optional(),
  callCount: z.number().int().min(1).max(10).nullable().optional(),
  eventNames: z.array(z.enum(EventName)).nullable().optional(),
  callLog: z.string().max(5000).nullable().optional(),
  recordFile: z.string().nullable().optional(),
  compensationStatus: z.enum(CompensationStatus).nullable().optional(),
  priority: z.enum(Priority).nullable().optional()
};

const createLeadSchema = z.object(leadFields).strict();

const updateLeadFields = {
  ...leadFields,
  fullName: fullNameSchema.optional(),
  gender: z.string().trim().min(1).max(20).optional(),
  mobile: optionalMobileString,
  statusNotes: z.string().max(2000, 'Notes cannot exceed 2000 characters').nullable().optional()
};

const updateLeadSchema = z.object(updateLeadFields).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'Request body cannot be empty'
});

const assignAccountSchema = z.object({
  accountId: z.number().int('accountId must be an integer').nullable()
}).strict();

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
    z.string().email('Email format is incorrect').max(255).optional()
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
  staffIds: z.array(z.number().int().positive()).min(1).max(100),
  teamId: z.number().int().positive().nullable().optional(),
  scope: z.object({
    type: z.string().optional(),
    teamId: z.number().int().positive().nullable().optional()
  }).optional(),
  method: z.literal('ROUND_ROBIN').default('ROUND_ROBIN')
}).refine(data => (data.leadIds && data.leadIds.length > 0), {
  message: 'leadIds must be provided and not empty'
}).transform(data => {
  const ids = data.leadIds || [];
  const uniqueLeadIds = [...new Set(ids)];
  const uniqueStaffIds = [...new Set(data.staffIds)];

  return {
    ...data,
    leadIds: uniqueLeadIds,
    staffIds: uniqueStaffIds,
    teamId: data.teamId ?? data.scope?.teamId ?? null
  };
});

module.exports = {
  createLeadSchema,
  updateLeadSchema,
  assignAccountSchema,
  sheetLeadSyncSchema,
  sanitizeSheetMobile,
  poolQuerySchema,
  recipientsQuerySchema,
  distributionRequestSchema,
  leadFields,
  capitalizeName
};

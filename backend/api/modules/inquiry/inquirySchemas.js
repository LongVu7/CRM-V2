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


const inquiryFields = {
  teamId: z.number().int('teamId must be an integer').nullable().optional(),
  statusDataId: z.number().int('statusDataId must be an integer').optional(),
  description: z.string().optional(),
  dataReceived: dateString.optional(),
  groupTele: z.string().max(50).optional(),
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

const createInquirySchema = z.object(inquiryFields).strict();

const updateInquirySchema = z.object({
  teamId: z.number().int().nullable().optional(),
  statusDataId: z.number().int().nullable().optional(),
  description: inquiryFields.description,
  dataReceived: dateString.nullable().optional(),
  groupTele: z.string().max(50).nullable().optional(),
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

const sheetInquirySyncSchema = z.object({
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

module.exports = {
  createInquirySchema,
  updateInquirySchema,
  assignStudentSchema,
  assignAccountSchema,
  sheetInquirySyncSchema,
  sanitizeSheetMobile
};


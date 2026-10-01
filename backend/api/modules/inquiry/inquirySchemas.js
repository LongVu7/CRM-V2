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
  eventNames: z.array(z.nativeEnum(EventName)).optional(),
  callLog: z.string().max(5000).optional(),
  recordFile: z.string().optional(),
  compensationStatus: z.nativeEnum(CompensationStatus).optional(),
  priority: z.nativeEnum(Priority).optional()
};

const createInquirySchema = z.object(inquiryFields).strict();

const updateInquirySchema = z.object({
  statusDataId: z.number().int().nullable().optional(),
  description: inquiryFields.description,
  dataReceived: dateString.nullable().optional(),
  groupTele: z.string().max(50).nullable().optional(),
  assignedToId: z.number().int().nullable().optional(),
  sourceDataId: z.number().int().nullable().optional(),
  createDate: dateString.nullable().optional(),
  interactionAt: dateString.nullable().optional(),
  callCount: z.number().int().min(1).max(10).nullable().optional(),
  eventNames: z.array(z.nativeEnum(EventName)).nullable().optional(),
  callLog: z.string().max(5000).nullable().optional(),
  recordFile: z.string().nullable().optional(),
  compensationStatus: z.nativeEnum(CompensationStatus).nullable().optional(),
  priority: z.nativeEnum(Priority).nullable().optional()
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'Request body cannot be empty'
});

const assignStudentSchema = z.object({
  studentId: z.number().int('studentId must be an integer')
}).strict();

const assignAccountSchema = z.object({
  accountId: z.number().int('accountId must be an integer')
}).strict();

module.exports = {
  createInquirySchema,
  updateInquirySchema,
  assignStudentSchema,
  assignAccountSchema
};


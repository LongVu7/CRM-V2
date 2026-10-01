const { z } = require('zod');

const createSchoolSchema = z.object({
  name: z.string().min(1, 'name is required').max(255),
  oldProvinceId: z.number().int().positive('oldProvinceId must be a positive integer'),
  schoolType: z.string().max(50).optional()
}).strict();

const updateSchoolSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  oldProvinceId: z.number().int().positive('oldProvinceId must be a positive integer').optional(),
  schoolType: z.string().max(50).optional()
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Request body cannot be empty' }
);

const schoolQuerySchema = z.object({
  oldProvinceId: z.string().regex(/^\d+$/, 'oldProvinceId must be a positive integer').optional(),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/, 'page must be a positive integer').optional(),
  limit: z.string().regex(/^\d+$/, 'limit must be a positive integer').optional()
});

module.exports = { createSchoolSchema, updateSchoolSchema, schoolQuerySchema };

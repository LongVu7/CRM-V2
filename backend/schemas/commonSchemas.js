const { z } = require('zod');

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'id must be a positive integer')
}).strict();

const searchSchema = z.object({
  query: z.string().min(1, 'Search query cannot be empty')
});

const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/, 'page must be a positive integer').optional().default('1'),
  limit: z.string().regex(/^\d+$/, 'limit must be a positive integer').optional().default('10')
}).strict();

module.exports = { idParamSchema, searchSchema, paginationSchema };

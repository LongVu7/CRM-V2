const { z } = require('zod');

const createTeamSchema = z.object({
  name: z.string({ required_error: 'Team name is required' })
    .trim()
    .min(1, 'Team name is required')
    .max(255, 'Team name cannot exceed 255 characters'),
  description: z.string().trim().max(1000).nullable().optional(),
  parentId: z.number().int().positive('parentId must be a positive integer').nullable().optional(),
  leaderId: z.number().int().positive('leaderId must be a positive integer').nullable().optional()
}).strict();

const updateTeamSchema = z.object({
  name: z.string().trim().min(1, 'Team name is required').max(255).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  parentId: z.number().int().positive('parentId must be a positive integer').nullable().optional(),
  leaderId: z.number().int().positive('leaderId must be a positive integer').nullable().optional()
}).strict();

const addMemberSchema = z.object({
  accountId: z.number({ required_error: 'accountId is required' })
    .int()
    .positive('accountId must be a positive integer'),
  roleId: z.number().int().positive('roleId must be a positive integer').nullable().optional()
}).strict();

const teamMemberParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'id must be a positive integer'),
  accountId: z.string().regex(/^\d+$/, 'accountId must be a positive integer')
}).strict();

const teamQuerySchema = z.object({
  page: z.string().regex(/^\d+$/, 'page must be a positive integer').optional().default('1'),
  limit: z.string().regex(/^\d+$/, 'limit must be a positive integer').optional().default('10'),
  search: z.string().optional()
});

module.exports = {
  createTeamSchema,
  updateTeamSchema,
  addMemberSchema,
  teamMemberParamsSchema,
  teamQuerySchema
};

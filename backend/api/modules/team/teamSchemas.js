const { z } = require('zod');

const scopeEnum = z.enum(['ALL', 'TEAM_ONLY', 'OWNER_ONLY'], {
  errorMap: () => ({ message: "scope must be one of 'ALL', 'TEAM_ONLY', 'OWNER_ONLY'" })
});

const createTeamSchema = z.object({
  name: z.string({ required_error: 'Team name is required' })
    .trim()
    .min(1, 'Team name is required')
    .max(255, 'Team name cannot exceed 255 characters'),
  description: z.string().trim().max(1000).nullable().optional(),
  leaderId: z.number().int().positive('leaderId must be a positive integer').nullable().optional()
}).strict();

const updateTeamSchema = z.object({
  name: z.string().trim().min(1, 'Team name is required').max(255).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  leaderId: z.number().int().positive('leaderId must be a positive integer').nullable().optional()
}).strict();

const addMemberSchema = z.object({
  accountId: z.number({ required_error: 'accountId is required' })
    .int()
    .positive('accountId must be a positive integer')
}).strict();

const teamPermissionItemSchema = z.object({
  permissionId: z.number({ required_error: 'permissionId is required' })
    .int()
    .positive('permissionId must be a positive integer'),
  scope: scopeEnum.default('TEAM_ONLY')
}).strict();

const teamPermissionsSchema = z.object({
  permissions: z.array(teamPermissionItemSchema, {
    required_error: 'permissions array is required'
  })
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
  scopeEnum,
  createTeamSchema,
  updateTeamSchema,
  addMemberSchema,
  teamPermissionItemSchema,
  teamPermissionsSchema,
  teamMemberParamsSchema,
  teamQuerySchema
};

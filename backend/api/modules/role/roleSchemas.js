const { z } = require('zod');

const scopeEnum = z.enum(['ALL', 'TEAM_ONLY', 'OWNER_ONLY'], {
  errorMap: () => ({ message: "scope must be one of 'ALL', 'TEAM_ONLY', 'OWNER_ONLY'" })
});

const rolePermissionItemSchema = z.object({
  permissionId: z.number({ required_error: 'permissionId is required' }).int().positive('permissionId must be a positive integer'),
  scope: scopeEnum.default('ALL')
}).strict();

const updateRolePermissionsSchema = z.object({
  permissions: z.array(rolePermissionItemSchema, {
    required_error: 'permissions array is required'
  })
}).strict();

const assignPermissionSchema = z.object({
  permissionId: z.number({ required_error: 'permissionId is required' }).int().positive('permissionId must be a positive integer'),
  scope: scopeEnum.default('ALL')
}).strict();

const roleAndPermissionParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'id must be a positive integer'),
  permissionId: z.string().regex(/^\d+$/, 'permissionId must be a positive integer')
}).strict();

module.exports = {
  scopeEnum,
  rolePermissionItemSchema,
  updateRolePermissionsSchema,
  assignPermissionSchema,
  roleAndPermissionParamsSchema
};

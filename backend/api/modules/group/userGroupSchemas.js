const { z } = require('zod');
const prisma = require('../../../config/db');
const { validateReadGatedMutations } = require('../../../authorization/permissionScopePolicy');

const createGroupSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required').max(255, 'Group name cannot exceed 255 characters'),
  groupLeaderId: z.union([z.number().int().positive(), z.null()]).optional(),
  permissionIds: z.array(z.number().int().positive()).optional().default([])
});

const updateGroupSchema = z.object({
  name: z.string().trim().min(1, 'Group name cannot be empty').max(255, 'Group name cannot exceed 255 characters').optional(),
  groupLeaderId: z.union([z.number().int().positive(), z.null()]).optional(),
  permissionIds: z.array(z.number().int().positive()).optional()
});

const memberActionSchema = z.object({
  accountId: z.coerce.number().int().positive({ message: 'Valid accountId is required' })
});

/**
 * Validate Scope Consistency Rule for a list of permission IDs:
 * Maps IDs to codes and asserts mutation scope <= read scope.
 */
async function validatePermissionIdsScopeConsistency(permissionIds) {
  if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
    return;
  }

  const permissions = await prisma.permission.findMany({
    where: { id: { in: permissionIds.map(Number) } },
    select: { code: true }
  });

  const codes = permissions.map(p => p.code);
  const result = validateReadGatedMutations(codes);

  if (!result.valid) {
    const error = new Error(result.error);
    error.status = 400;
    throw error;
  }
}

module.exports = {
  createGroupSchema,
  updateGroupSchema,
  memberActionSchema,
  validatePermissionIdsScopeConsistency
};

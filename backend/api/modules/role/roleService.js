const prisma = require('../../../config/db');

// ─── Core Role CRUD Operations

/**
 * List all roles with account and permission counts
 */
const getAllRoles = async () => {
  const roles = await prisma.role.findMany({
    orderBy: { id: 'asc' },
    include: {
      _count: { select: { accounts: true, permissions: true } }
    }
  });
  return roles;
};

/**
 * Get single role by ID with its permissions
 * @param {number|string} id
 */
const getRoleById = async (id) => {
  const role = await prisma.role.findUnique({
    where: { id: Number(id) },
    include: {
      permissions: {
        include: { permission: true }
      },
      _count: { select: { accounts: true } }
    }
  });

  if (!role) {
    const error = new Error('Role not found');
    error.statusCode = 404;
    throw error;
  }

  return {
    ...role,
    permissionIds: role.permissions.map(rp => ({
      permissionId: rp.permissionId,
      scope: rp.scope
    })),
    rawPermissionIds: role.permissions.map(rp => rp.permissionId),
    permissionCodes: role.permissions.map(rp => rp.permission.code)
  };
};

/**
 * Create role with optional initial permissions
 * @param {object} data - { name, description, permissionIds }
 */
const createRole = async ({ name, description, permissionIds } = {}) => {
  if (!name?.trim()) {
    const error = new Error('Role name is required');
    error.statusCode = 400;
    throw error;
  }

  const existing = await prisma.role.findUnique({ where: { name: name.trim() } });
  if (existing) {
    const error = new Error('A role with this name already exists');
    error.statusCode = 409;
    throw error;
  }

  const role = await prisma.$transaction(async (tx) => {
    const newRole = await tx.role.create({
      data: {
        name: name.trim(),
        description: description || null
      }
    });

    if (Array.isArray(permissionIds) && permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map(pid => ({
          roleId: newRole.id,
          permissionId: typeof pid === 'object' ? Number(pid.permissionId) : Number(pid),
          scope: (typeof pid === 'object' && pid.scope) ? pid.scope : 'ALL'
        }))
      });
    }

    return tx.role.findUnique({
      where: { id: newRole.id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { accounts: true } }
      }
    });
  });

  return {
    ...role,
    permissionIds: role.permissions.map(rp => ({
      permissionId: rp.permissionId,
      scope: rp.scope
    }))
  };
};

/**
 * Update role metadata and permissions
 * @param {number|string} id
 * @param {object} data - { name, description, permissionIds }
 */
const updateRole = async (id, { name, description, permissionIds } = {}) => {
  const existing = await prisma.role.findUnique({ where: { id: Number(id) } });
  if (!existing) {
    const error = new Error('Role not found');
    error.statusCode = 404;
    throw error;
  }

  if (name && name.trim() !== existing.name) {
    const duplicate = await prisma.role.findUnique({ where: { name: name.trim() } });
    if (duplicate) {
      const error = new Error('A role with this name already exists');
      error.statusCode = 409;
      throw error;
    }
  }

  const role = await prisma.$transaction(async (tx) => {
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description || null;

    await tx.role.update({
      where: { id: Number(id) },
      data: updateData
    });

    if (Array.isArray(permissionIds)) {
      await tx.rolePermission.deleteMany({ where: { roleId: Number(id) } });
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map(pid => ({
            roleId: Number(id),
            permissionId: typeof pid === 'object' ? Number(pid.permissionId) : Number(pid),
            scope: (typeof pid === 'object' && pid.scope) ? pid.scope : 'ALL'
          }))
        });
      }
    }

    return tx.role.findUnique({
      where: { id: Number(id) },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { accounts: true } }
      }
    });
  });

  return {
    ...role,
    permissionIds: role.permissions.map(rp => ({
      permissionId: rp.permissionId,
      scope: rp.scope
    }))
  };
};

/**
 * Delete a role (blocked if accounts are currently assigned)
 * @param {number|string} id
 */
const deleteRole = async (id) => {
  const existing = await prisma.role.findUnique({
    where: { id: Number(id) },
    include: { _count: { select: { accounts: true } } }
  });

  if (!existing) {
    const error = new Error('Role not found');
    error.statusCode = 404;
    throw error;
  }

  if (existing._count.accounts > 0) {
    const error = new Error(`Cannot delete role "${existing.name}" because ${existing._count.accounts} account(s) are still assigned to it. Reassign those accounts first.`);
    error.statusCode = 409;
    throw error;
  }

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId: Number(id) } });
    await tx.role.delete({ where: { id: Number(id) } });
  });

  return { success: true };
};

// ─── Role Permission & Scope Administration

/**
 * Get all permissions and scopes assigned to a role
 * @param {number|string} roleId
 */
const getRolePermissions = async (roleId) => {
  const role = await prisma.role.findUnique({
    where: { id: Number(roleId) },
    include: {
      permissions: {
        include: { permission: true },
        orderBy: { permissionId: 'asc' }
      }
    }
  });

  if (!role) {
    const error = new Error('Role not found');
    error.statusCode = 404;
    throw error;
  }

  return {
    roleId: role.id,
    roleName: role.name,
    permissions: role.permissions.map(rp => ({
      permissionId: rp.permissionId,
      code: rp.permission.code,
      resource: rp.permission.resource,
      action: rp.permission.action,
      scope: rp.scope,
      description: rp.permission.description
    }))
  };
};

/**
 * Update/replace all permissions and scopes for a role
 */
const updateRolePermissions = async (roleId, permissionsWithScope) => {
  const role = await prisma.role.findUnique({ where: { id: Number(roleId) } });
  if (!role) {
    const error = new Error('Role not found');
    error.statusCode = 404;
    throw error;
  }

  if (permissionsWithScope && permissionsWithScope.length > 0) {
    const permIds = permissionsWithScope.map(p => Number(p.permissionId));
    const existingPerms = await prisma.permission.findMany({
      where: { id: { in: permIds } },
      select: { id: true }
    });

    if (existingPerms.length !== permIds.length) {
      const foundIds = new Set(existingPerms.map(p => p.id));
      const missingIds = permIds.filter(id => !foundIds.has(id));
      const error = new Error(`Invalid permission IDs: ${missingIds.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId: Number(roleId) } });
    if (permissionsWithScope && permissionsWithScope.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionsWithScope.map(p => ({
          roleId: Number(roleId),
          permissionId: Number(p.permissionId),
          scope: p.scope || 'ALL'
        }))
      });
    }
  });

  return {
    roleId: Number(roleId),
    totalAssigned: permissionsWithScope.length
  };
};

/**
 * Assign or update a single permission with scope for a role
 */
const assignPermissionToRole = async (roleId, permissionId, scope = 'ALL') => {
  const role = await prisma.role.findUnique({ where: { id: Number(roleId) } });
  if (!role) {
    const error = new Error('Role not found');
    error.statusCode = 404;
    throw error;
  }

  const permission = await prisma.permission.findUnique({ where: { id: Number(permissionId) } });
  if (!permission) {
    const error = new Error(`Permission with ID ${permissionId} not found`);
    error.statusCode = 404;
    throw error;
  }

  const assigned = await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: Number(roleId),
        permissionId: Number(permissionId)
      }
    },
    create: {
      roleId: Number(roleId),
      permissionId: Number(permissionId),
      scope: scope || 'ALL'
    },
    update: {
      scope: scope || 'ALL'
    }
  });

  return {
    roleId: assigned.roleId,
    permissionId: assigned.permissionId,
    scope: assigned.scope
  };
};

/**
 * Remove a single permission from a role
 */
const removePermissionFromRole = async (roleId, permissionId) => {
  const existing = await prisma.rolePermission.findUnique({
    where: {
      roleId_permissionId: {
        roleId: Number(roleId),
        permissionId: Number(permissionId)
      }
    }
  });

  if (!existing) {
    const error = new Error('Permission assignment not found for this role');
    error.statusCode = 404;
    throw error;
  }

  await prisma.rolePermission.delete({
    where: {
      roleId_permissionId: {
        roleId: Number(roleId),
        permissionId: Number(permissionId)
      }
    }
  });

  return { success: true };
};

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  updateRolePermissions,
  assignPermissionToRole,
  removePermissionFromRole
};

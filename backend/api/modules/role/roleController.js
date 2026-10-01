const prisma = require('../../../config/db');

// ─── List all roles (with permission count)
const getAllRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: { select: { accounts: true, permissions: true } }
      }
    });

    res.status(200).json({
      message: 'Roles retrieved successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      roles
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles', details: error.message });
  }
};

// ─── Get single role with its permissions
const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

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
      return res.status(404).json({ error: 'Role not found' });
    }

    // Flatten permission codes for easier frontend consumption
    const data = {
      ...role,
      permissionIds: role.permissions.map(rp => rp.permissionId),
      permissionCodes: role.permissions.map(rp => rp.permission.code)
    };

    res.status(200).json({
      message: 'Role retrieved successfully',
      data
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch role', details: error.message });
  }
};

// ─── Create role with permissions
const createRole = async (req, res) => {
  try {
    const { name, description, permissionIds } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    // Check for duplicate name
    const existing = await prisma.role.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return res.status(409).json({ error: 'A role with this name already exists' });
    }

    const role = await prisma.$transaction(async (tx) => {
      const newRole = await tx.role.create({
        data: {
          name: name.trim(),
          description: description || null
        }
      });

      // Link permissions if provided
      if (Array.isArray(permissionIds) && permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map(pid => ({
            roleId: newRole.id,
            permissionId: Number(pid)
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

    res.status(201).json({
      message: 'Role created successfully',
      data: {
        ...role,
        permissionIds: role.permissions.map(rp => rp.permissionId)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create role', details: error.message });
  }
};

// ─── Update role (name, description, permissions)
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissionIds } = req.body;

    const existing = await prisma.role.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Check duplicate name (exclude current)
    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.role.findUnique({ where: { name: name.trim() } });
      if (duplicate) {
        return res.status(409).json({ error: 'A role with this name already exists' });
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

      // Replace permission links if provided
      if (Array.isArray(permissionIds)) {
        await tx.rolePermission.deleteMany({ where: { roleId: Number(id) } });
        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map(pid => ({
              roleId: Number(id),
              permissionId: Number(pid)
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

    res.status(200).json({
      message: 'Role updated successfully',
      data: {
        ...role,
        permissionIds: role.permissions.map(rp => rp.permissionId)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role', details: error.message });
  }
};

// ─── Delete role (blocked if active accounts are assigned)
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.role.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { accounts: true } } }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Block deletion if accounts are assigned to this role
    if (existing._count.accounts > 0) {
      return res.status(409).json({
        error: `Cannot delete role "${existing.name}" because ${existing._count.accounts} account(s) are still assigned to it. Reassign those accounts first.`
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: Number(id) } });
      await tx.role.delete({ where: { id: Number(id) } });
    });

    res.status(200).json({
      message: 'Role deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete role', details: error.message });
  }
};

module.exports = { getAllRoles, getRoleById, createRole, updateRole, deleteRole };
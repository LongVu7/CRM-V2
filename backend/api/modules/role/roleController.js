const roleService = require('./roleService');

// ─── List all roles
const getAllRoles = async (req, res) => {
  try {
    const roles = await roleService.getAllRoles();
    res.status(200).json({
      message: 'Roles retrieved successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      roles
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
};

// ─── Get single role with its permissions
const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await roleService.getRoleById(id);
    res.status(200).json({
      message: 'Role retrieved successfully',
      data
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
};

// ─── Create role with permissions
const createRole = async (req, res) => {
  try {
    const data = await roleService.createRole(req.body);
    res.status(201).json({
      message: 'Role created successfully',
      data
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
};

// ─── Update role (name, description, permissions)
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await roleService.updateRole(id, req.body);
    res.status(200).json({
      message: 'Role updated successfully',
      data
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
};

// ─── Delete role
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    await roleService.deleteRole(id);
    res.status(200).json({
      message: 'Role deleted successfully'
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
};

// ─── Role Permission Management
const getRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await roleService.getRolePermissions(id);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

const updateRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    const data = await roleService.updateRolePermissions(id, permissions);
    res.status(200).json({
      success: true,
      message: 'Role permissions and scopes updated successfully',
      data
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

const assignPermissionToRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissionId, scope } = req.body;
    const data = await roleService.assignPermissionToRole(id, permissionId, scope);
    res.status(201).json({
      success: true,
      message: 'Permission assigned with scope successfully',
      data
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

const removePermissionFromRole = async (req, res) => {
  try {
    const { id, permissionId } = req.params;
    await roleService.removePermissionFromRole(id, permissionId);
    res.status(200).json({
      success: true,
      message: 'Permission removed from role successfully'
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
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
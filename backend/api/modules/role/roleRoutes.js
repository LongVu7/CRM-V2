const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { requireAdmin } = authorize;
const { validateBody, validateParams } = require('../../../middleware/validate');
const { idParamSchema } = require('../../../schemas/commonSchemas');
const {
  updateRolePermissionsSchema,
  assignPermissionSchema,
  roleAndPermissionParamsSchema
} = require('./roleSchemas');
const roleController = require('./roleController');

// All role administration routes are restricted strictly to Administrators
router.use(authenticate, requireAdmin);

// ─── Roles CRUD
router.route('/')
    .get(authenticate, authorize('read', 'role'), roleController.getAllRoles)
    .post(authenticate, authorize('create', 'role'), roleController.createRole);

router.route('/:id')
    .get(authenticate, authorize('read', 'role'), validateParams(idParamSchema), roleController.getRoleById)
    .put(authenticate, authorize('update', 'role'), validateParams(idParamSchema), roleController.updateRole)
    .delete(authenticate, authorize('delete', 'role'), validateParams(idParamSchema), roleController.deleteRole);

// ─── Role Permissions & Scopes Administration
router.route('/:id/permissions')
    .get(authenticate, authorize('read', 'role'), validateParams(idParamSchema), roleController.getRolePermissions)
    .put(authenticate, authorize('update', 'role'), validateParams(idParamSchema), validateBody(updateRolePermissionsSchema), roleController.updateRolePermissions)
    .post(authenticate, authorize('update', 'role'), validateParams(idParamSchema), validateBody(assignPermissionSchema), roleController.assignPermissionToRole);

router.route('/:id/permissions/:permissionId')
    .delete(authenticate, authorize('update', 'role'), validateParams(roleAndPermissionParamsSchema), roleController.removePermissionFromRole);

module.exports = router;
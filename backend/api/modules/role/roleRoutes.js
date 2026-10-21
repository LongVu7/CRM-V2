const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { validateBody, validateParams } = require('../../../middleware/validate');
const { idParamSchema } = require('../../../schemas/commonSchemas');
const {
  updateRolePermissionsSchema,
  assignPermissionSchema,
  roleAndPermissionParamsSchema
} = require('./roleSchemas');
const roleController = require('./roleController');

// ─── Roles CRUD
router.route('/')
    .get(authenticate, authorize('role.read'), roleController.getAllRoles)
    .post(authenticate, authorize('role.create'), roleController.createRole);

router.route('/:id')
    .get(authenticate, authorize('role.read'), validateParams(idParamSchema), roleController.getRoleById)
    .put(authenticate, authorize('role.update'), validateParams(idParamSchema), roleController.updateRole)
    .delete(authenticate, authorize('role.delete'), validateParams(idParamSchema), roleController.deleteRole);

// ─── Role Permissions & Scopes Administration
router.route('/:id/permissions')
    .get(authenticate, authorize('role.read'), validateParams(idParamSchema), roleController.getRolePermissions)
    .put(authenticate, authorize('role.update'), validateParams(idParamSchema), validateBody(updateRolePermissionsSchema), roleController.updateRolePermissions)
    .post(authenticate, authorize('role.update'), validateParams(idParamSchema), validateBody(assignPermissionSchema), roleController.assignPermissionToRole);

router.route('/:id/permissions/:permissionId')
    .delete(authenticate, authorize('role.update'), validateParams(roleAndPermissionParamsSchema), roleController.removePermissionFromRole);

module.exports = router;
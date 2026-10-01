const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { validateParams } = require('../../../middleware/validate');
const { idParamSchema } = require('../../../schemas/commonSchemas');
const roleController = require('./roleController');

// ─── Roles CRUD
router.route('/')
    .get(authenticate, authorize('role.read'), roleController.getAllRoles)
    .post(authenticate, authorize('role.create'), roleController.createRole);

router.route('/:id')
    .get(authenticate, authorize('role.read'), validateParams(idParamSchema), roleController.getRoleById)
    .put(authenticate, authorize('role.update'), validateParams(idParamSchema), roleController.updateRole)
    .delete(authenticate, authorize('role.delete'), validateParams(idParamSchema), roleController.deleteRole);

module.exports = router;
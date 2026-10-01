const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const permissionController = require('./permissionController');

// ─── List all system permissions (admin only — used for PermissionMatrix)
router.route('/')
    .get(authenticate, authorize('role.read'), permissionController.getAllPermissions);

module.exports = router;

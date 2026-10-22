const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const permissionController = require('./permissionController');

// ─── List all system permissions 
router.route('/')
    .get(authenticate, authorize(['role.read', 'team.assign_perm']), permissionController.getAllPermissions);

module.exports = router;

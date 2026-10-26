const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const permissionController = require('./permissionController');

// ─── List all system permissions 
router.route('/')
    .get(authenticate, authorize([['read', 'role'], ['assign_perm', 'team']]), permissionController.getAllPermissions);

module.exports = router;

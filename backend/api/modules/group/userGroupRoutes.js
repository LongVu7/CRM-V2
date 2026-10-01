const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { resolveGroupOwnership } = require('../../../authorization/scope/groupScope');
const userGroupController = require('./userGroupController');

const withOwnership = { ownership: { resolver: resolveGroupOwnership } };

// ─── CRUD routes
router.route('/')
    .get(authenticate, authorize('group.read'), userGroupController.getAllGroups)
    .post(authenticate, authorize('group.create'), userGroupController.createGroup);

router.route('/:id')
    .get(authenticate, authorize('group.read', withOwnership), userGroupController.getGroupById)
    .put(authenticate, authorize('group.update', withOwnership), userGroupController.updateGroup)
    .delete(authenticate, authorize('group.delete', withOwnership), userGroupController.deleteGroup);

// ─── Group members management
router.route('/:id/add-member')
    .put(authenticate, authorize('group.update', withOwnership), userGroupController.addMemberToGroup);

router.route('/:id/remove-member')
    .put(authenticate, authorize('group.update', withOwnership), userGroupController.removeMemberFromGroup);

module.exports = router;

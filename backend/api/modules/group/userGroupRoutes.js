/**
 * Group Management API Routes
 *
 * Implements two-tier authorization:
 * - Administrators: Global group management (CRUD, leader assignment, permission configuration)
 * - Group Leaders: Delegated roster management for assigned groups only (add/remove active members)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { resolveGroupOwnership, resolveGroupManageOwnership } = require('../../../authorization/scope/groupScope');
const userGroupController = require('./userGroupController');

const withReadOwnership = { ownership: { resolver: resolveGroupOwnership } };
const withManageOwnership = { ownership: { resolver: resolveGroupManageOwnership } };

router.route('/')
  .get(authenticate, authorize('group.read'), userGroupController.getAllGroups)
  .post(authenticate, authorize('group.create'), userGroupController.createGroup);

router.route('/:id')
  .get(authenticate, authorize('group.read', withReadOwnership), userGroupController.getGroupById)
  .put(authenticate, authorize('group.update', withManageOwnership), userGroupController.updateGroup)
  .delete(authenticate, authorize('group.delete', withManageOwnership), userGroupController.deleteGroup);

router.route('/:id/add-member')
  .put(authenticate, authorize('group.update', withManageOwnership), userGroupController.addMemberToGroup);

router.route('/:id/remove-member')
  .put(authenticate, authorize('group.update', withManageOwnership), userGroupController.removeMemberFromGroup);

module.exports = router;

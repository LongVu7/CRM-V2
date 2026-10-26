const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { requireAdmin } = authorize;
const { validateBody, validateParams, validateQuery } = require('../../../middleware/validate');
const { idParamSchema } = require('../../../schemas/commonSchemas');
const {
  createTeamSchema,
  updateTeamSchema,
  addMemberSchema,
  teamMemberParamsSchema,
  teamQuerySchema
} = require('./teamSchemas');
const teamController = require('./teamController');

// Resource parameter for ownership/scope checks
const teamIdorCheck = { resourceModel: 'team' };

// ─── Team Available Accounts Endpoint (for membership & leadership)
router.route('/available-accounts')
  .get(authenticate, authorize([['update', 'team'], ['create', 'team'], ['read', 'team']]), teamController.getAvailableAccounts);

// ─── Hierarchical Team Tree Endpoint
router.route('/tree')
  .get(authenticate, authorize('read', 'team'), teamController.getTeamTree);

// ─── Team Parent Hierarchy Options Endpoint
router.route('/parent-options')
  .get(authenticate, authorize([['create', 'team'], ['update', 'team'], ['read', 'team']]), teamController.getParentTeamOptions);

// ─── Team CRUD Endpoints
router.route('/')
  .get(authenticate, authorize('read', 'team'), validateQuery(teamQuerySchema), teamController.getAllTeams)
  .post(authenticate, requireAdmin, validateBody(createTeamSchema), teamController.createTeam);

router.route('/:id')
  .get(authenticate, authorize('read', 'team', teamIdorCheck), validateParams(idParamSchema), teamController.getTeamById)
  .put(authenticate, authorize('update', 'team', teamIdorCheck), validateParams(idParamSchema), validateBody(updateTeamSchema), teamController.updateTeam)
  .delete(authenticate, requireAdmin, validateParams(idParamSchema), teamController.deleteTeam);

// ─── Team Membership Endpoints
router.route('/:id/members')
  .post(authenticate, authorize('update', 'team', teamIdorCheck), validateParams(idParamSchema), validateBody(addMemberSchema), teamController.addMember);

router.route('/:id/members/:accountId')
  .delete(authenticate, authorize('update', 'team', teamIdorCheck), validateParams(teamMemberParamsSchema), teamController.removeMember);

module.exports = router;

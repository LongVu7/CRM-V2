const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { validateBody, validateParams, validateQuery } = require('../../../middleware/validate');
const { idParamSchema } = require('../../../schemas/commonSchemas');
const {
  createTeamSchema,
  updateTeamSchema,
  addMemberSchema,
  teamPermissionsSchema,
  teamMemberParamsSchema,
  teamQuerySchema
} = require('./teamSchemas');
const teamController = require('./teamController');

const teamIdorCheck = { resourceModel: 'team' };

// ─── Team CRUD Endpoints
router.route('/')
  .get(authenticate, authorize('team.read'), validateQuery(teamQuerySchema), teamController.getAllTeams)
  .post(authenticate, authorize('team.create'), validateBody(createTeamSchema), teamController.createTeam);

router.route('/:id')
  .get(authenticate, authorize('team.read', teamIdorCheck), validateParams(idParamSchema), teamController.getTeamById)
  .put(authenticate, authorize('team.update', teamIdorCheck), validateParams(idParamSchema), validateBody(updateTeamSchema), teamController.updateTeam)
  .delete(authenticate, authorize('team.delete', teamIdorCheck), validateParams(idParamSchema), teamController.deleteTeam);

// ─── Team Membership & Permissions Endpoints
router.route('/:id/members')
  .post(authenticate, authorize('team.update', teamIdorCheck), validateParams(idParamSchema), validateBody(addMemberSchema), teamController.addMember);

router.route('/:id/members/:accountId')
  .delete(authenticate, authorize('team.update', teamIdorCheck), validateParams(teamMemberParamsSchema), teamController.removeMember);

router.route('/:id/permissions')
  .put(authenticate, authorize('team.update', teamIdorCheck), validateParams(idParamSchema), validateBody(teamPermissionsSchema), teamController.updateTeamPermissions);

module.exports = router;

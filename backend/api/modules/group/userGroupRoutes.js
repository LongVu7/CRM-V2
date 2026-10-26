const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const teamService = require('../team/teamService');

// Deprecation header middleware
router.use((req, res, next) => {
  res.set('X-API-Deprecated', 'true');
  res.set('X-API-Deprecation-Notice', '/api/groups is deprecated. Please migrate to /api/teams.');
  next();
});

const teamIdorCheck = { resourceModel: 'team' };

// ─── CRUD routes shimmed to teamService
router.route('/')
  .get(authenticate, authorize('read', 'team'), async (req, res) => {
    try {
      const result = await teamService.getAllTeams(req.query, req.permissionScope);
      res.status(200).json({
        message: 'Get all groups successfully',
        warning: 'This endpoint is deprecated. Use GET /api/teams instead.',
        totalGroups: result.pagination.total,
        groups: result.data.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          groupLeader: t.leader,
          memberCount: t.memberCount,
          createdAt: t.createdAt
        }))
      });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  })
  .post(authenticate, authorize('create', 'team'), async (req, res) => {
    try {
      const leaderId = req.body.leaderId !== undefined ? req.body.leaderId : req.body.groupLeaderId;
      const data = await teamService.createTeam({
        name: req.body.name,
        description: req.body.description,
        leaderId
      }, req.user?.accountId);
      res.status(201).json({
        message: 'Group created successfully',
        warning: 'This endpoint is deprecated. Use POST /api/teams instead.',
        data
      });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  });

router.route('/:id')
  .get(authenticate, authorize('read', 'team', teamIdorCheck), async (req, res) => {
    try {
      const team = await teamService.getTeamById(req.params.id, req.permissionScope);
      res.status(200).json({
        message: 'Get group by ID successfully',
        warning: 'This endpoint is deprecated. Use GET /api/teams/:id instead.',
        data: {
          ...team,
          groupLeader: team.leader,
          accounts: team.members
        }
      });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  })
  .put(authenticate, authorize('update', 'team', teamIdorCheck), async (req, res) => {
    try {
      const leaderId = req.body.leaderId !== undefined ? req.body.leaderId : req.body.groupLeaderId;
      const data = await teamService.updateTeam(req.params.id, {
        name: req.body.name,
        description: req.body.description,
        leaderId
      });
      res.status(200).json({
        message: 'Group updated successfully',
        warning: 'This endpoint is deprecated. Use PUT /api/teams/:id instead.',
        data
      });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  })
  .delete(authenticate, authorize('delete', 'team', teamIdorCheck), async (req, res) => {
    try {
      await teamService.deleteTeam(req.params.id);
      res.status(200).json({
        message: 'Group deleted successfully',
        warning: 'This endpoint is deprecated. Use DELETE /api/teams/:id instead.'
      });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  });

// ─── Group members management shimmed to team members
router.route('/:id/add-member')
  .put(authenticate, authorize('update', 'team', teamIdorCheck), async (req, res) => {
    try {
      const { accountId } = req.body;
      if (!accountId) {
        return res.status(400).json({ error: 'accountId is required' });
      }
      const data = await teamService.addMember(req.params.id, accountId);
      res.status(200).json({
        message: 'Member added to group successfully',
        warning: 'This endpoint is deprecated. Use POST /api/teams/:id/members instead.',
        data
      });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  });

router.route('/:id/remove-member')
  .put(authenticate, authorize('update', 'team', teamIdorCheck), async (req, res) => {
    try {
      const { accountId } = req.body;
      if (!accountId) {
        return res.status(400).json({ error: 'accountId is required' });
      }
      await teamService.removeMember(req.params.id, accountId);
      res.status(200).json({
        message: 'Member removed from group successfully',
        warning: 'This endpoint is deprecated. Use DELETE /api/teams/:id/members/:accountId instead.'
      });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ error: error.message });
    }
  });

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { validateBody, validateParams } = require('../../../middleware/validate');
const { idParamSchema } = require('../../../schemas/commonSchemas');
const { campaignSchema, updateCampaignSchema, activitySchema, updateActivitySchema, activityRecipientSchema, campaignTemplateSchema } = require('./campaignSchemas');
const campaignController = require('./campaignController');

const campaignIdorCheck = { resourceModel: 'campaign' };

// ─── Available owners for campaign assignment ───
router.route('/available-owners')
    .get(authenticate, authorize([['create', 'campaign'], ['update', 'campaign'], ['read', 'campaign']]), campaignController.getAvailableOwners);

// ─── CRUD routes for Campaigns ───
router.route('/')
    .get(authenticate, authorize('read', 'campaign'), campaignController.listCampaigns)
    .post(authenticate, authorize('create', 'campaign'), validateBody(campaignSchema), campaignController.createCampaign);

router.route('/:id')
    .get(authenticate, authorize('read', 'campaign', campaignIdorCheck), validateParams(idParamSchema), campaignController.getCampaignById)
    .put(authenticate, authorize('update', 'campaign', campaignIdorCheck), validateParams(idParamSchema), validateBody(updateCampaignSchema), campaignController.updateCampaign)
    .delete(authenticate, authorize('delete', 'campaign', campaignIdorCheck), validateParams(idParamSchema), campaignController.deleteCampaign);

// ─── Activity routes  ───
router.route('/:id/activities')
    .post(authenticate, authorize('create', 'campaign'), validateParams(idParamSchema), validateBody(activitySchema), campaignController.createActivity);

router.route('/:id/activities/:activityId')
    .put(authenticate, authorize('update', 'campaign'), validateBody(updateActivitySchema), campaignController.updateActivity)
    .delete(authenticate, authorize('delete', 'campaign'), campaignController.deleteActivity);

// ─── Activity Recipients ───
router.route('/:id/activities/:activityId/recipients')
    .post(authenticate, authorize('update', 'campaign'), validateBody(activityRecipientSchema), campaignController.addRecipients);

// ─── Send Activity (email) ───
router.route('/:id/activities/:activityId/send')
    .post(authenticate, authorize('update', 'campaign'), campaignController.sendActivity);

module.exports = router;

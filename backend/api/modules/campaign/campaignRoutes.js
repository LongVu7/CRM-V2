const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { validateBody, validateParams } = require('../../../middleware/validate');
const { idParamSchema } = require('../../../schemas/commonSchemas');
const { campaignSchema, updateCampaignSchema, activitySchema, updateActivitySchema, activityRecipientSchema, campaignTemplateSchema } = require('./campaignSchemas');
const campaignController = require('./campaignController');

// ─── CRUD routes for Campaigns ───
router.route('/')
    .get(authenticate, authorize('campaign.read'), campaignController.listCampaigns)
    .post(authenticate, authorize('campaign.create'), validateBody(campaignSchema), campaignController.createCampaign);

router.route('/:id')
    .get(authenticate, authorize('campaign.read'), validateParams(idParamSchema), campaignController.getCampaignById)
    .put(authenticate, authorize('campaign.update'), validateParams(idParamSchema), validateBody(updateCampaignSchema), campaignController.updateCampaign)
    .delete(authenticate, authorize('campaign.delete'), validateParams(idParamSchema), campaignController.deleteCampaign);

// ─── Activity routes  ───
router.route('/:id/activities')
    .post(authenticate, authorize('campaign.create'), validateParams(idParamSchema), validateBody(activitySchema), campaignController.createActivity);

router.route('/:id/activities/:activityId')
    .put(authenticate, authorize('campaign.update'), validateBody(updateActivitySchema), campaignController.updateActivity)
    .delete(authenticate, authorize('campaign.delete'), campaignController.deleteActivity);

// ─── Activity Recipients ───
router.route('/:id/activities/:activityId/recipients')
    .post(authenticate, authorize('campaign.update'), validateBody(activityRecipientSchema), campaignController.addRecipients);

// ─── Send Activity (email) ───
router.route('/:id/activities/:activityId/send')
    .post(authenticate, authorize('campaign.update'), campaignController.sendActivity);

module.exports = router;

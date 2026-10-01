const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { validateBody, validateParams } = require('../../../middleware/validate');
const { idParamSchema } = require('../../../schemas/commonSchemas');
const { campaignTemplateSchema, updateTemplateSchema } = require('./templateSchemas');
const templateController = require('./templateController');

router.route('/')
    .get(authenticate, authorize('campaign_template.read'), templateController.listTemplates)
    .post(authenticate, authorize('campaign_template.create'), validateBody(campaignTemplateSchema), templateController.createTemplate);

router.route('/variables')
    .get(authenticate, authorize('campaign_template.read'), templateController.getVariables);

router.route('/:id')
    .get(authenticate, authorize('campaign_template.read'), validateParams(idParamSchema), templateController.getTemplateById)
    .patch(authenticate, authorize('campaign_template.update'), validateParams(idParamSchema), validateBody(updateTemplateSchema), templateController.updateTemplate)
    .delete(authenticate, authorize('campaign_template.delete'), validateParams(idParamSchema), templateController.deleteTemplate);

module.exports = router;

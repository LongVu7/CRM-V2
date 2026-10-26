const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { validateBody, validateParams } = require('../../../middleware/validate');
const { idParamSchema } = require('../../../schemas/commonSchemas');
const { campaignTemplateSchema, updateTemplateSchema } = require('./templateSchemas');
const templateController = require('./templateController');

router.route('/')
    .get(authenticate, authorize('read', 'campaign_template'), templateController.listTemplates)
    .post(authenticate, authorize('create', 'campaign_template'), validateBody(campaignTemplateSchema), templateController.createTemplate);

router.route('/variables')
    .get(authenticate, authorize('read', 'campaign_template'), templateController.getVariables);

router.route('/:id')
    .get(authenticate, authorize('read', 'campaign_template'), validateParams(idParamSchema), templateController.getTemplateById)
    .patch(authenticate, authorize('update', 'campaign_template'), validateParams(idParamSchema), validateBody(updateTemplateSchema), templateController.updateTemplate)
    .delete(authenticate, authorize('delete', 'campaign_template'), validateParams(idParamSchema), templateController.deleteTemplate);

module.exports = router;

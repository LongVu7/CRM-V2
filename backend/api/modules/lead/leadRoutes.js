const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { validateBody, validateParams, validateQuery } = require('../../../middleware/validate');
const { idParamSchema } = require('../../../schemas/commonSchemas');
const {
  createLeadSchema,
  updateLeadSchema,
  assignStudentSchema,
  assignAccountSchema,
  poolQuerySchema,
  recipientsQuerySchema,
  distributionRequestSchema
} = require('./leadSchemas');
const upload = require('../../../middleware/upload');
const leadController = require('./leadController');

const leadIdorCheck = { resourceModel: 'lead' };

// ─── Search routes
router.route('/search/students')
    .get(authenticate, authorize([['create', 'lead'], ['read', 'lead'], ['update', 'lead']]), leadController.searchStudents);

router.route('/search/accounts')
    .get(authenticate, authorize([['assign', 'lead'], ['create', 'lead']]), leadController.searchAccounts);

// ─── Import routes
router.route('/import/template')
    .get(authenticate, authorize('import', 'lead'), leadController.downloadTemplate);

router.route('/import/preview')
    .post(authenticate, authorize('import', 'lead'), upload.single('file'), leadController.previewImportLead);

router.route('/import/confirm')
    .post(authenticate, authorize('import', 'lead'), leadController.confirmImportLead);

router.route('/import/sheet-sync')
    .post(authenticate, authorize('import', 'lead'), leadController.importFromGoogleSheets);

router.route('/import-sheets')
    .post(authenticate, authorize('import', 'lead'), leadController.importFromGoogleSheets);

// ─── Distribution routes
router.route('/distribution/pool')
    .get(authenticate, authorize('distribute', 'lead'), validateQuery(poolQuerySchema), leadController.getUnassignedPool);

router.route('/distribution/scopes')
    .get(authenticate, authorize('distribute', 'lead'), leadController.getDistributionScopes);

router.route('/distribution/recipients')
    .get(authenticate, authorize('distribute', 'lead'), validateQuery(recipientsQuerySchema), leadController.getScopeRecipients);

router.route('/distribution/preview')
    .post(authenticate, authorize('distribute', 'lead'), validateBody(distributionRequestSchema), leadController.previewDistribution);

router.route('/distribution')
    .post(authenticate, authorize('distribute', 'lead'), validateBody(distributionRequestSchema), leadController.distributeLeads);

// ─── CRUD routes
router.route('/')
    .get(authenticate, authorize('read', 'lead'), leadController.getAllLeads)
    .post(authenticate, authorize('create', 'lead'), validateBody(createLeadSchema), leadController.createLead);

router.route('/options')
    .get(authenticate, leadController.getLeadOptions);

router.route('/export')
    .get(authenticate, authorize('export', 'lead'), leadController.exportLeads);

router.route('/:id')
    .get(authenticate, authorize('read', 'lead', leadIdorCheck), validateParams(idParamSchema), leadController.getLeadById)
    .put(authenticate, authorize('update', 'lead', leadIdorCheck), validateParams(idParamSchema), validateBody(updateLeadSchema), leadController.updateLead)
    .delete(authenticate, authorize('delete', 'lead', leadIdorCheck), validateParams(idParamSchema), leadController.deleteLead);

router.route('/:id/status-history')
    .get(authenticate, authorize('read', 'lead', leadIdorCheck), validateParams(idParamSchema), leadController.getLeadStatusHistory);

// ─── Assignment routes
router.route('/:id/assign-student')
    .put(authenticate, authorize('update', 'lead', leadIdorCheck), validateParams(idParamSchema), validateBody(assignStudentSchema), leadController.assignStudentToLead)
    .delete(authenticate, authorize('update', 'lead', leadIdorCheck), validateParams(idParamSchema), validateBody(assignStudentSchema), leadController.unassignStudentFromLead);

router.route('/:id/assign-account')
    .put(authenticate, authorize('assign', 'lead', leadIdorCheck), validateParams(idParamSchema), validateBody(assignAccountSchema), leadController.assignAccountToLead);

module.exports = router;

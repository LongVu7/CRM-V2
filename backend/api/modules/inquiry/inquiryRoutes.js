const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { validateBody, validateParams } = require('../../../middleware/validate');
const { idParamSchema } = require('../../../schemas/commonSchemas');
const { createInquirySchema, updateInquirySchema, assignStudentSchema, assignAccountSchema } = require('./inquirySchemas');
const upload = require('../../../middleware/upload');
const inquiryController = require('./inquiryController');

const inquiryIdorCheck = { resourceModel: 'inquiry' };

// ─── Search routes
router.route('/search/students')
    .get(authenticate, authorize([['create', 'inquiry'], ['read', 'inquiry'], ['update', 'inquiry']]), inquiryController.searchStudents);

router.route('/search/accounts')
    .get(authenticate, authorize([['assign', 'inquiry'], ['create', 'inquiry']]), inquiryController.searchAccounts);

// ─── Import routes
router.route('/import/template')
    .get(authenticate, authorize('import', 'inquiry'), inquiryController.downloadTemplate);

router.route('/import/preview')
    .post(authenticate, authorize('import', 'inquiry'), upload.single('file'), inquiryController.previewImportInquiry);

router.route('/import/confirm')
    .post(authenticate, authorize('import', 'inquiry'), inquiryController.confirmImportInquiry);

router.route('/import/sheet-sync')
    .post(authenticate, authorize('import', 'inquiry'), inquiryController.importFromGoogleSheets);

router.route('/import-sheets')
    .post(authenticate, authorize('import', 'inquiry'), inquiryController.importFromGoogleSheets);

// ─── CRUD routes
router.route('/')
    .get(authenticate, authorize('read', 'inquiry'), inquiryController.getAllInquiries)
    .post(authenticate, authorize('create', 'inquiry'), validateBody(createInquirySchema), inquiryController.createInquiry);

router.route('/options')
    .get(authenticate, inquiryController.getInquiryOptions);

router.route('/export')
    .get(authenticate, authorize('export', 'inquiry'), inquiryController.exportInquiries);

router.route('/:id')
    .get(authenticate, authorize('read', 'inquiry', inquiryIdorCheck), validateParams(idParamSchema), inquiryController.getInquiryById)
    .put(authenticate, authorize('update', 'inquiry', inquiryIdorCheck), validateParams(idParamSchema), validateBody(updateInquirySchema), inquiryController.updateInquiry)
    .delete(authenticate, authorize('delete', 'inquiry', inquiryIdorCheck), validateParams(idParamSchema), inquiryController.deleteInquiry);

router.route('/:id/status-history')
    .get(authenticate, authorize('read', 'inquiry', inquiryIdorCheck), validateParams(idParamSchema), inquiryController.getInquiryStatusHistory);

// ─── Assignment routes
router.route('/:id/assign-student')
    .put(authenticate, authorize('update', 'inquiry', inquiryIdorCheck), validateParams(idParamSchema), validateBody(assignStudentSchema), inquiryController.assignStudentToInquiry)
    .delete(authenticate, authorize('update', 'inquiry', inquiryIdorCheck), validateParams(idParamSchema), validateBody(assignStudentSchema), inquiryController.unassignStudentFromInquiry);

router.route('/:id/assign-account')
    .put(authenticate, authorize('assign', 'inquiry', inquiryIdorCheck), validateParams(idParamSchema), validateBody(assignAccountSchema), inquiryController.assignAccountToInquiry);

module.exports = router;

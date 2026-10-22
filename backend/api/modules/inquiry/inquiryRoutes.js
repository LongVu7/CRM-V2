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
    .get(authenticate, authorize(['inquiry.create', 'inquiry.read', 'inquiry.update']), inquiryController.searchStudents);

router.route('/search/accounts')
    .get(authenticate, authorize(['inquiry.assign', 'inquiry.create']), inquiryController.searchAccounts);

// ─── Import routes
router.route('/import/template')
    .get(authenticate, authorize('inquiry.import'), inquiryController.downloadTemplate);

router.route('/import/preview')
    .post(authenticate, authorize('inquiry.import'), upload.single('file'), inquiryController.previewImportInquiry);

router.route('/import/confirm')
    .post(authenticate, authorize('inquiry.import'), inquiryController.confirmImportInquiry);

router.route('/import/sheet-sync')
    .post(authenticate, authorize('inquiry.import'), inquiryController.importFromGoogleSheets);

router.route('/import-sheets')
    .post(authenticate, authorize('inquiry.import'), inquiryController.importFromGoogleSheets);

// ─── CRUD routes
router.route('/')
    .get(authenticate, authorize('inquiry.read'), inquiryController.getAllInquiries)
    .post(authenticate, authorize('inquiry.create'), validateBody(createInquirySchema), inquiryController.createInquiry);

router.route('/options')
    .get(authenticate, inquiryController.getInquiryOptions);

router.route('/export')
    .get(authenticate, authorize('inquiry.export'), inquiryController.exportInquiries);

router.route('/:id')
    .get(authenticate, authorize('inquiry.read', inquiryIdorCheck), validateParams(idParamSchema), inquiryController.getInquiryById)
    .put(authenticate, authorize('inquiry.update', inquiryIdorCheck), validateParams(idParamSchema), validateBody(updateInquirySchema), inquiryController.updateInquiry)
    .delete(authenticate, authorize('inquiry.delete', inquiryIdorCheck), validateParams(idParamSchema), inquiryController.deleteInquiry);

// ─── Assignment routes
router.route('/:id/assign-student')
    .put(authenticate, authorize('inquiry.update', inquiryIdorCheck), validateParams(idParamSchema), validateBody(assignStudentSchema), inquiryController.assignStudentToInquiry)
    .delete(authenticate, authorize('inquiry.update', inquiryIdorCheck), validateParams(idParamSchema), validateBody(assignStudentSchema), inquiryController.unassignStudentFromInquiry);

router.route('/:id/assign-account')
    .put(authenticate, authorize('inquiry.assign', inquiryIdorCheck), validateParams(idParamSchema), validateBody(assignAccountSchema), inquiryController.assignAccountToInquiry);

module.exports = router;

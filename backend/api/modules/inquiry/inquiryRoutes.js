const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { validateBody, validateParams } = require('../../../middleware/validate');
const { idParamSchema } = require('../../../schemas/commonSchemas');
const { createInquirySchema, updateInquirySchema, assignStudentSchema, assignAccountSchema } = require('./inquirySchemas');
const upload = require('../../../middleware/upload');
const inquiryController = require('./inquiryController');

const { inquiryPermissions, withInquiryOwnership: withOwnership } = require('../../../authorization/scope/inquiryScope');

// Search routes
router.route('/search/students')
    .get(authenticate, authorize(inquiryPermissions.SEARCH), inquiryController.searchStudents);

router.route('/search/accounts')
    .get(authenticate, authorize(inquiryPermissions.ASSIGN), inquiryController.searchAccounts);

// ─── Import routes
router.route('/import/template')
    .get(authenticate, authorize(inquiryPermissions.IMPORT), inquiryController.downloadTemplate);

router.route('/import/preview')
    .post(authenticate, authorize(inquiryPermissions.IMPORT), upload.single('file'), inquiryController.previewImportInquiry);

router.route('/import/confirm')
    .post(authenticate, authorize(inquiryPermissions.IMPORT), inquiryController.confirmImportInquiry);

router.route('/import/sheet-sync')
    .post(authenticate, authorize(inquiryPermissions.IMPORT), inquiryController.importFromGoogleSheets);

router.route('/import-sheets')
    .post(authenticate, authorize(inquiryPermissions.IMPORT), inquiryController.importFromGoogleSheets);

// ─── CRUD routes
router.route('/')
    .get(authenticate, authorize(inquiryPermissions.READ), inquiryController.getAllInquiries)
    .post(authenticate, authorize(inquiryPermissions.CREATE), validateBody(createInquirySchema), inquiryController.createInquiry);

router.route('/options')
    .get(authenticate, inquiryController.getInquiryOptions);

router.route('/export')
    .get(authenticate, authorize(inquiryPermissions.EXPORT), inquiryController.exportInquiries);

router.route('/:id')
    .get(authenticate, authorize(inquiryPermissions.READ, withOwnership), validateParams(idParamSchema), inquiryController.getInquiryById)
    .put(authenticate, authorize(inquiryPermissions.UPDATE, withOwnership), validateParams(idParamSchema), validateBody(updateInquirySchema), inquiryController.updateInquiry)
    .delete(authenticate, authorize(inquiryPermissions.DELETE, withOwnership), validateParams(idParamSchema), inquiryController.deleteInquiry);

// ─── Assignment routes
router.route('/:id/assign-student')
    .put(authenticate, authorize(inquiryPermissions.UPDATE, withOwnership), validateParams(idParamSchema), validateBody(assignStudentSchema), inquiryController.assignStudentToInquiry)
    .delete(authenticate, authorize(inquiryPermissions.UPDATE, withOwnership), validateParams(idParamSchema), validateBody(assignStudentSchema), inquiryController.unassignStudentFromInquiry);

router.route('/:id/assign-account')
    .put(authenticate, authorize(inquiryPermissions.ASSIGN), validateParams(idParamSchema), validateBody(assignAccountSchema), inquiryController.assignAccountToInquiry);

module.exports = router;

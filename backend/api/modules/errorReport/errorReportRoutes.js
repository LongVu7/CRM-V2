const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const errorReportController = require('./errorReportController');

router.post('/', authenticate, authorize('error_report.create'), errorReportController.create);
router.get('/', authenticate, authorize('error_report.read'), errorReportController.list);
router.get('/:id', authenticate, authorize('error_report.read'), errorReportController.getById);
router.patch('/:id/status', authenticate, authorize('error_report.update'), errorReportController.updateStatus);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const errorReportController = require('./errorReportController');

router.post('/', authenticate, errorReportController.create);
router.get('/', authenticate, errorReportController.list);
router.get('/:id', authenticate, errorReportController.getById);
router.patch('/:id/status', authenticate, errorReportController.updateStatus);

module.exports = router;

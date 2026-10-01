const express = require('express');
const router = express.Router();

const { getDashboardReport } = require('./reportController');
const { getDashboardReportSchema } = require('./reportSchema');
const { validateQuery } = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');

router.get(
  '/dashboard',
  authenticate,
  authorize('report.read'),
  validateQuery(getDashboardReportSchema.shape.query),
  getDashboardReport
);

module.exports = router;

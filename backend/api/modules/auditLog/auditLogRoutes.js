const express = require('express');
const router = express.Router();
const auditLogController = require('./auditLogController');
const { authorize } = require('../../middlewares/auth');

router.get('/', authorize(['admin']), auditLogController.getAllAuditLogs);

module.exports = router;

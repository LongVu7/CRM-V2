const auditLogService = require('./auditLogService');

const handleError = (res, error) => {
  const status = error.status || 500;
  res.status(status).json({ error: error.message, ...(status === 500 && { details: error.message }) });
};

const getAllAuditLogs = async (req, res) => {
  try {
    const filters = req.query;
    const { logs, totalCount } = await auditLogService.getAllAuditLogs(filters);
    res.status(200).json({
      message: 'Audit logs retrieved successfully',
      data: logs,
      totalCount
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  getAllAuditLogs
};

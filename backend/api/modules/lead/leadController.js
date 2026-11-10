const leadService = require('./leadService');
const { generateExcelBuffer } = require('../../utils/excelExport');
const { syncGoogleSheetsToLeads } = require('./leadGoogleSheetService');
const fs = require('fs');
const leadImportService = require('./leadImportService');
const leadDistributionService = require('./leadDistributionService');
const { parseExcelFiles } = require('../../utils/excelParser');
const { parsePagination } = require('../../utils/pagination');

// Error handling
const handleError = (res, error) => {
  const status = error.statusCode || error.status || 500;
  res.status(status).json({
    error: error.message,
    ...(error.reason && { reason: error.reason }),
    message: error.message,
    ...(error.details && { details: error.details }),
    ...(status === 500 && { details: error.message })
  });
};



// ─── List all leads
const getAllLeads = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const search = req.query.search || '';
    const hasStudent = req.query.hasStudent === 'true';
    const statusGeneral = req.query.statusGeneral || null;
    const assignedTo = req.query.assignedTo || null;
    const birthYear = req.query.birthYear || null;
    const oldProvinceId = req.query.oldProvinceId || null;
    const sortField = req.query.sortField || null;
    const sortOrder = req.query.sortOrder || null;

    const { leads, pagination } = await leadService.getAllLeads({ page, limit, skip, search, user: req.user, permissionScope: req.permissionScope, unassignedOnly: req.query.unassignedOnly, hasStudent, statusGeneral, assignedTo, birthYear, oldProvinceId, sortField, sortOrder });

    res.status(200).json({
      message: 'Leads retrieved successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data: leads,
      pagination
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Export Leads
const exportLeads = async (req, res) => {
  try {
    const filters = {
      search: req.query.search || '',
      hasStudent: req.query.hasStudent === 'true',
      statusGeneral: req.query.statusGeneral || null,
      assignedTo: req.query.assignedTo || null,
      birthYear: req.query.birthYear || null,
      oldProvinceId: req.query.oldProvinceId || null
    };

    const data = await leadService.exportLeads(filters, req.permissionScope);
    const buffer = generateExcelBuffer(data, 'Leads');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="leads-${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Get specific lead
const getLeadById = async (req, res) => {
  try {
    const data = await leadService.getLeadById(req.params.id);
    res.status(200).json({
      message: 'Lead retrieved successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Create lead
const createLead = async (req, res) => {
  try {
    const data = await leadService.createLead(req.body, req.user);
    res.status(201).json({
      message: 'Lead created successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Update lead
const updateLead = async (req, res) => {
  try {
    const data = await leadService.updateLead(req.params.id, req.body, req.user);
    res.status(200).json({
      message: 'Lead updated successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Get lead status history
const getLeadStatusHistory = async (req, res) => {
  try {
    const data = await leadService.getLeadStatusHistory(req.params.id);
    res.status(200).json(data);
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Delete lead (and associated student records)
const deleteLead = async (req, res) => {
  try {
    await leadService.deleteLead(req.params.id);
    res.status(200).json({
      message: 'Lead and associated student deleted successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId
    });
  } catch (error) {
    handleError(res, error);
  }
};



// ─── Assign an account to an lead
const assignAccountToLead = async (req, res) => {
  try {
    const { accountId } = req.body;

    if (accountId === undefined) {
      return res.status(400).json({ error: 'accountId is required in the request body' });
    }

    const data = await leadService.assignAccountToLead(req.params.id, accountId, req.user);
    res.status(200).json({
      message: accountId ? 'Account assigned to lead successfully' : 'Account unassigned from lead successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

const bulkAssignLeads = async (req, res) => {
  try {
    const { leadIds, accountId } = req.body;
    const result = await leadService.bulkAssignLeads(leadIds, accountId, req.user, req.permissionScope);
    res.status(200).json({
      message: accountId ? `Successfully assigned ${result.updatedCount} leads` : `Successfully unassigned ${result.updatedCount} leads`,
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data: result
    });
  } catch (error) {
    handleError(res, error);
  }
};

const bulkDeleteLeads = async (req, res) => {
  try {
    const { leadIds } = req.body;
    const result = await leadService.bulkDeleteLeads(leadIds, req.user, req.permissionScope);
    res.status(200).json({
      message: `Successfully deleted ${result.deletedCount} leads`,
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data: result
    });
  } catch (error) {
    handleError(res, error);
  }
};



// ─── Search staff accounts (for assignment UI)
const searchAccounts = async (req, res) => {
  try {
    const { q } = req.query;
    const results = await leadService.searchAccounts(q, req.user);
    res.status(200).json({
      message: 'Staff search results',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      results
    });
  } catch (error) {
    handleError(res, error);
  }
};




// ─── Import Endpoints

const downloadTemplate = (req, res) => {
  try {
    const buffer = leadImportService.generateTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="lead_import_template.xlsx"');
    res.send(buffer);
  } catch (error) {
    handleError(res, error);
  }
};

const previewImportLead = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const parsedData = parseExcelFiles([req.file]);
    
    // Clean up uploaded file
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    const result = await leadImportService.previewImportLead(parsedData, req.user.accountId);

    res.status(200).json({
      message: 'Preview generated successfully',
      data: result
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    handleError(res, error);
  }
};

const confirmImportLead = async (req, res) => {
  try {
    const { importToken } = req.body;
    if (!importToken) {
      return res.status(400).json({ error: 'importToken is required' });
    }

    const result = await leadImportService.confirmImportLead(importToken, req.user.accountId);

    res.status(200).json({
      message: 'Import confirmed successfully',
      data: result
    });
  } catch (error) {
    handleError(res, error);
  }
};

const importFromGoogleSheets = async (req, res) => {
  try {
    if (req.query.async === 'true') {
      res.status(202).json({
        message: 'Google Sheets import has started and is running in the background.'
      });

      setImmediate(async () => {
        try {
          await syncGoogleSheetsToLeads();
        } catch (err) {
          console.error(JSON.stringify({ error: 'Background sync failed', details: err.message }));
        }
      });
      return;
    }

    const results = await syncGoogleSheetsToLeads();
    const totalImported = results.reduce((acc, r) => acc + (r.importedCount || r.newStudentsCreated || 0), 0);
    const totalSkipped = results.reduce((acc, r) => acc + (r.skipped || 0), 0);

    res.status(200).json({
      message: `Google Sheets sync completed: ${totalImported} lead(s) imported (${totalSkipped} skipped).`,
      data: results
    });
  } catch (error) {
    handleError(res, error);
  }
};

const getLeadOptions = async (req, res) => {
  try {
    const data = await leadService.getLeadOptions();
    res.status(200).json({
      message: 'Lead options retrieved successfully',
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Distribution handlers
const getUnassignedPool = async (req, res) => {
  try {
    const result = await leadDistributionService.getUnassignedPool(req.query);
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

const getDistributionScopes = async (req, res) => {
  try {
    const result = await leadDistributionService.getDistributionScopes(req.user);
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

const getScopeRecipients = async (req, res) => {
  try {
    const result = await leadDistributionService.getScopeRecipients(req.query, req.user);
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

const previewDistribution = async (req, res) => {
  try {
    const result = await leadDistributionService.previewDistribution(req.body, req.user);
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

const distributeLeads = async (req, res) => {
  try {
    const result = await leadDistributionService.distributeLeads(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

const getCreatedLeadStats = async (req, res) => {
  try {
    const isCollab = (req.user?.roleName || '').toLowerCase() === 'collaborator';
    const targetAccountId = (!isCollab && req.query.accountId)
      ? parseInt(req.query.accountId, 10)
      : (req.user?.accountId || req.user?.id);

    const stats = await leadService.getCreatedLeadStats(targetAccountId);
    res.status(200).json({
      message: 'Get created lead stats successfully',
      data: stats
    });
  } catch (error) {
    handleError(res, error);
  }
};

const getLeadStats = async (req, res) => {
  try {
    const stats = await leadService.getLeadStats(req.user, req.query);
    res.status(200).json({
      message: 'Get lead stats successfully',
      data: stats
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  getAllLeads,
  exportLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  assignAccountToLead,
  bulkAssignLeads,
  bulkDeleteLeads,
  searchAccounts,
  downloadTemplate,
  previewImportLead,
  confirmImportLead,
  importFromGoogleSheets,
  getLeadOptions,
  getLeadStatusHistory,
  getUnassignedPool,
  getDistributionScopes,
  getScopeRecipients,
  previewDistribution,
  distributeLeads,
  getCreatedLeadStats,
  getLeadStats,
};

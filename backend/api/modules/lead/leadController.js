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

// ─── Delete lead (preserves student records)
const deleteLead = async (req, res) => {
  try {
    await leadService.deleteLead(req.params.id);
    res.status(200).json({
      message: 'Lead deleted successfully. Associated student records were preserved.',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Assign a student to an lead
const assignStudentToLead = async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required in the request body' });
    }

    const data = await leadService.assignStudentToLead(req.params.id, studentId);
    res.status(200).json({
      message: 'Student assigned to lead successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Unassign a student from an lead
const unassignStudentFromLead = async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required in the request body' });
    }

    await leadService.unassignStudentFromLead(req.params.id, studentId);
    res.status(200).json({
      message: 'Student unassigned from lead successfully',
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

    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required in the request body' });
    }

    const data = await leadService.assignAccountToLead(req.params.id, accountId);
    res.status(200).json({
      message: 'Account assigned to lead successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Search students (for assignment UI)
const searchStudents = async (req, res) => {
  try {
    const { q } = req.query;

    const results = await leadService.searchStudents(q);
    res.status(200).json({
      message: 'Students search results',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      results
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Search staff accounts (for assignment UI)
const searchAccounts = async (req, res) => {
  try {
    const { q } = req.query;

    const results = await leadService.searchAccounts(q);
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
    res.setHeader('Content-Disposition', 'attachment; filename="inquiry_import_template.xlsx"');
    res.send(buffer);
  } catch (error) {
    handleError(res, error);
  }
};

const previewImportInquiry = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const parsedData = parseExcelFiles([req.file]);
    
    // Clean up uploaded file
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    const result = await leadImportService.previewImportInquiry(parsedData, req.user.accountId);

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

const confirmImportInquiry = async (req, res) => {
  try {
    const { importToken } = req.body;
    if (!importToken) {
      return res.status(400).json({ error: 'importToken is required' });
    }

    const result = await leadImportService.confirmImportInquiry(importToken, req.user.accountId);

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
    const totalStudents = results.reduce((acc, r) => acc + (r.newStudentsCreated || 0), 0);
    const totalInquiries = results.reduce((acc, r) => acc + (r.newInquiriesForExisting || 0), 0);
    const totalUpdated = results.reduce((acc, r) => acc + (r.existingStudentsUpdated || 0), 0);
    const totalSkipped = results.reduce((acc, r) => acc + (r.skipped || 0), 0);

    res.status(200).json({
      message: `Google Sheets sync completed: ${totalStudents} new student(s), ${totalInquiries} new lead(s) created, ${totalUpdated} student(s) updated (${totalSkipped} skipped).`,
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

module.exports = {
  getAllLeads,
  exportLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  assignStudentToLead,
  unassignStudentFromLead,
  assignAccountToLead,
  searchStudents,
  searchAccounts,
  downloadTemplate,
  previewImportInquiry,
  confirmImportInquiry,
  importFromGoogleSheets,
  getLeadOptions,
  getLeadStatusHistory,
  getUnassignedPool,
  getDistributionScopes,
  getScopeRecipients,
  previewDistribution,
  distributeLeads,

  // Compatibility aliases
  getAllInquiries: getAllLeads,
  exportInquiries: exportLeads,
  getInquiryById: getLeadById,
  createInquiry: createLead,
  updateInquiry: updateLead,
  deleteInquiry: deleteLead,
  assignStudentToInquiry: assignStudentToLead,
  unassignStudentFromInquiry: unassignStudentFromLead,
  assignAccountToInquiry: assignAccountToLead,
  getInquiryOptions: getLeadOptions,
  getInquiryStatusHistory: getLeadStatusHistory
};

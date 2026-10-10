const inquiryService = require('./inquiryService');
const { generateExcelBuffer } = require('../../utils/exportUtils');
const { syncGoogleSheetsToInquiries } = require('./inquiryGoogleSheetService');

// Error handling
const handleError = (res, error) => {
  const status = error.status || 500;
  res.status(status).json({ error: error.message, ...(status === 500 && { details: error.message }) });
};

const { parsePagination } = require('../../utils/pagination');

// ─── List all inquiries
const getAllInquiries = async (req, res) => {
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

    const { inquiries, pagination } = await inquiryService.getAllInquiries({ page, limit, skip, search, user: req.user, hasStudent, statusGeneral, assignedTo, birthYear, oldProvinceId, sortField, sortOrder });

    res.status(200).json({
      message: 'Inquiries retrieved successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data: inquiries,
      pagination
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Export Inquiries
const exportInquiries = async (req, res) => {
  try {
    const filters = {
      search: req.query.search || '',
      hasStudent: req.query.hasStudent === 'true',
      statusGeneral: req.query.statusGeneral || null,
      assignedTo: req.query.assignedTo || null,
      birthYear: req.query.birthYear || null,
      oldProvinceId: req.query.oldProvinceId || null
    };

    const data = await inquiryService.exportInquiries(filters, req.user);
    const buffer = generateExcelBuffer(data, 'Inquiries');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="inquiries-${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Get specific inquiry
const getInquiryById = async (req, res) => {
  try {
    const data = req.resource || await inquiryService.getInquiryById(req.params.id);
    res.status(200).json({
      message: 'Inquiry retrieved successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Create inquiry
const createInquiry = async (req, res) => {
  try {
    const data = await inquiryService.createInquiry(req.body, req.user);
    res.status(201).json({
      message: 'Inquiry created successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Update inquiry
const updateInquiry = async (req, res) => {
  try {
    const data = await inquiryService.updateInquiry(req.params.id, req.body);
    res.status(200).json({
      message: 'Inquiry updated successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Delete inquiry (preserves student records)
const deleteInquiry = async (req, res) => {
  try {
    await inquiryService.deleteInquiry(req.params.id);
    res.status(200).json({
      message: 'Inquiry deleted successfully. Associated student records were preserved.',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Assign a student to an inquiry
const assignStudentToInquiry = async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required in the request body' });
    }

    const data = await inquiryService.assignStudentToInquiry(req.params.id, studentId);
    res.status(200).json({
      message: 'Student assigned to inquiry successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Unassign a student from an inquiry
const unassignStudentFromInquiry = async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required in the request body' });
    }

    await inquiryService.unassignStudentFromInquiry(req.params.id, studentId);
    res.status(200).json({
      message: 'Student unassigned from inquiry successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Assign an account to an inquiry
const assignAccountToInquiry = async (req, res) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required in the request body' });
    }

    const data = await inquiryService.assignAccountToInquiry(req.params.id, accountId);
    res.status(200).json({
      message: 'Account assigned to inquiry successfully',
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

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const results = await inquiryService.searchStudents(q);
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

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const results = await inquiryService.searchAccounts(q);
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

const fs = require('fs');
const inquiryImportService = require('./inquiryImportService');
const { parseExcelFiles } = require('../../utils/excelParser');

// ─── Import Endpoints

const downloadTemplate = (req, res) => {
  try {
    const buffer = inquiryImportService.generateTemplate();
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

    const result = await inquiryImportService.previewImportInquiry(parsedData, req.user.accountId);

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

    const result = await inquiryImportService.confirmImportInquiry(importToken, req.user.accountId);

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
    // Return 202 Accepted immediately
    res.status(202).json({
      message: 'Google Sheets import has started and is running in the background.'
    });

    // Run the sync asynchronously to prevent blocking the request thread
    setImmediate(async () => {
      try {
        await syncGoogleSheetsToInquiries();
      } catch (err) {
        console.error(JSON.stringify({ error: 'Background sync failed', details: err.message }));
      }
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  getAllInquiries,
  exportInquiries,
  getInquiryById,
  createInquiry,
  updateInquiry,
  deleteInquiry,
  assignStudentToInquiry,
  unassignStudentFromInquiry,
  assignAccountToInquiry,
  searchStudents,
  searchAccounts,
  downloadTemplate,
  previewImportInquiry,
  confirmImportInquiry,
  importFromGoogleSheets
};

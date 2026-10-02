const { google } = require('googleapis');
const xlsx = require('xlsx');
const auth = require('../../../config/googleAuth');
const { previewImportInquiry, confirmImportInquiry } = require('./inquiryImportService');

const HEADER_MAP_WEB_HCM = {
  'Name': 'Full Name',
  'Phone': 'Mobile',
  'Email': 'Email',
  'School': 'School',
  'Address': 'Old Province',
  'Course': 'Specific Major',
  'UTM-medium': 'Source Detail',
  'UTM-name': 'Approach Method'
};

const HEADER_MAP_MULTIPLE_CHOICE = {
  'Họ và tên': 'Full Name',
  'Số điện thoại': 'Mobile',
  'Email': 'Email',
  'Trường THPT': 'School',
  'Tỉnh/thành': 'Old Province',
  'UTM-campaign': 'Source Detail',
  'UTM-medium': 'Approach Method',
  'Lớp': 'Class'
};


/**
 * Export a Google Sheet to an xlsx Buffer using the Drive API
 * @param {string} sheetId - The ID of the Google Sheet
 * @param {object} auth - The google.auth.JWT client
 * @returns {Promise<Buffer>}
 */
async function exportSheetToXlsx(sheetId, auth) {
  const drive = google.drive({ version: 'v3', auth });

  const response = await drive.files.export(
    {
      fileId: sheetId,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data);
}

/**
 * Reads an xlsx buffer, remaps columns, injects static fields, and returns a new xlsx buffer
 * @param {Buffer} xlsxBuffer - The original xlsx file buffer
 * @param {object} headerMap - Object mapping original header names to new header names
 * @param {object} injectedFields - Key-value pairs to inject into every row
 * @returns {Buffer} - The new xlsx file buffer
 */
function remapHeaders(xlsxBuffer, headerMap, injectedFields = {}) {
  // Read the workbook from buffer
  const workbook = xlsx.read(xlsxBuffer, { type: 'buffer' });

  // Assume the first sheet is the one we want
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert sheet to JSON array of objects
  const rows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

  // Process each row
  const remappedRows = rows.map(row => {
    const newRow = {};

    // Map existing columns
    for (const [originalKey, value] of Object.entries(row)) {
      if (headerMap[originalKey]) {
        newRow[headerMap[originalKey]] = value;
      }
    }

    // Inject static fields
    for (const [key, value] of Object.entries(injectedFields)) {
      newRow[key] = value;
    }

    return newRow;
  });

  // Convert JSON back to a new worksheet
  const newWorksheet = xlsx.utils.json_to_sheet(remappedRows);

  // Create a new workbook and append the new worksheet
  const newWorkbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');

  // Write the workbook to a buffer
  return xlsx.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });
}

// Automated sync for Google Sheets to Inquiries
async function syncGoogleSheetsToInquiries() {
  const systemAccountId = process.env.SYSTEM_ACCOUNT_ID;

  if (!systemAccountId) {
    console.error(JSON.stringify({
      severity: 'ERROR',
      message: 'SYSTEM_ACCOUNT_ID is not set in the environment variables',
      error: 'SYSTEM_ACCOUNT_ID is not set in the environment variables',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  const sheetsToSync = [
    {
      id: process.env.GOOGLE_SHEET_ID_WEB_HCM,
      name: 'WEB_HCM',
      headerMap: HEADER_MAP_WEB_HCM,
      source: 'Online'
    },
    {
      id: process.env.GOOGLE_SHEET_ID_MULTIPLE_CHOICE,
      name: 'MULTIPLE_CHOICE',
      headerMap: HEADER_MAP_MULTIPLE_CHOICE,
      source: 'Offline'
    }
  ];

  for (const sheet of sheetsToSync) {
    if (!sheet.id) {
      console.error(JSON.stringify({
        severity: 'ERROR',
        message: 'Missing environment variable for sheet ID',
        sheet: sheet.name,
        error: `Missing environment variable for sheet ID`,
        timestamp: new Date().toISOString()
      }));
      continue;
    }

    try {
      // 1. Export as XLSX
      // const xlsxBuffer = await exportSheetToXlsx(sheet.id, auth);

      // // 2. Remap headers
      // const remappedBuffer = remapHeaders(xlsxBuffer, sheet.headerMap, { Source: sheet.source });

      // // 3. Preview Import
      // const { importToken } = await previewImportInquiry(
      //   { buffer: remappedBuffer, originalname: `${sheet.name}.xlsx` },
      //   systemAccountId
      // );

      // 1. Export as XLSX
      const xlsxBuffer = await exportSheetToXlsx(sheet.id, auth);

      console.log(JSON.stringify({
        severity: 'INFO',
        message: 'Google Sheet exported',
        sheet: sheet.name,
        exportedBytes: xlsxBuffer?.length,
        isBuffer: Buffer.isBuffer(xlsxBuffer),
        timestamp: new Date().toISOString()
      }));

      // // 2. Remap headers
      const remappedBuffer = remapHeaders(
        xlsxBuffer,
        sheet.headerMap,
        { Source: sheet.source }
      );

      // 3. Preview Import
      console.log(JSON.stringify({
        severity: 'INFO',
        message: 'Headers remapped',
        sheet: sheet.name,
        remappedBytes: remappedBuffer?.length,
        isBuffer: Buffer.isBuffer(remappedBuffer),
        timestamp: new Date().toISOString()
      }));

      const file = {
        buffer: remappedBuffer,
        originalname: `${sheet.name}.xlsx`,
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: remappedBuffer.length
      };

      console.log(JSON.stringify({
        severity: 'INFO',
        message: 'Preparing import file',
        sheet: sheet.name,
        fileSize: file.size,
        originalname: file.originalname,
        mimetype: file.mimetype,
        timestamp: new Date().toISOString()
      }));

      const { importToken, summary, rows: previewRows } = await previewImportInquiry(
        file.buffer,
        systemAccountId
      );

      // Log preview classification breakdown so we know WHY rows are skipped
      console.log(JSON.stringify({
        severity: 'INFO',
        message: 'Preview classification breakdown',
        sheet: sheet.name,
        totalRows: summary.total,
        readyNew: summary.readyNew,
        readyExisting: summary.readyExisting,
        existingInquiry: summary.existingInquiry,
        duplicateInFile: summary.duplicateInFile,
        mappingIssue: summary.mappingIssue,
        invalid: summary.invalid,
        timestamp: new Date().toISOString()
      }));

      // Log per-row detail for MAPPING_ISSUE rows
      const mappingIssueRows = previewRows.filter(r => r._meta.classification === 'MAPPING_ISSUE');
      if (mappingIssueRows.length > 0) {
        console.log(JSON.stringify({
          severity: 'WARNING',
          message: 'Mapping issue details',
          sheet: sheet.name,
          rows: mappingIssueRows.map(r => ({
            rowNumber: r._meta.rowNumber,
            mobile: r.mobile,
            fullName: r.fullName,
            errors: r._meta.errors
          })),
          timestamp: new Date().toISOString()
        }));
      }

      // Log per-row detail for INVALID rows
      const invalidRows = previewRows.filter(r => r._meta.classification === 'INVALID');
      if (invalidRows.length > 0) {
        console.log(JSON.stringify({
          severity: 'WARNING',
          message: 'Invalid row details',
          sheet: sheet.name,
          rows: invalidRows.map(r => ({
            rowNumber: r._meta.rowNumber,
            mobile: r.mobile,
            fullName: r.fullName,
            errors: r._meta.errors
          })),
          timestamp: new Date().toISOString()
        }));
      }

      // 4. Confirm Import
      const result = await confirmImportInquiry(importToken, systemAccountId);

      console.log(JSON.stringify({
        severity: 'INFO',
        message: 'Sync completed',
        sheet: sheet.name,
        newStudentsCreated: result.newStudentsCreated,
        newInquiriesForExisting: result.newInquiriesForExisting,
        skipped: result.skipped,
        timestamp: new Date().toISOString()
      }));

    } catch (error) {
      console.error(JSON.stringify({
        severity: 'ERROR',
        message: 'Error during sheet sync',
        sheet: sheet.name,
        error: error.message || error,
        timestamp: new Date().toISOString()
      }));
    }
  }
}

module.exports = {
  exportSheetToXlsx,
  remapHeaders,
  syncGoogleSheetsToInquiries
};

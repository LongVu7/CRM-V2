const { google } = require('googleapis');
const xlsx = require('xlsx');
const auth = require('../../../config/googleAuth');
const { validateInquiryRows, insertInquiryRows } = require('./inquiryImportService');

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
 * Fetch rows from a Google Sheet using the Sheets API
 * @param {string} sheetId - The ID of the Google Sheet
 * @param {object} auth - The google.auth.JWT client
 * @returns {Promise<Array<Object>>}
 */
async function fetchSheetRows(sheetId, auth) {
  const sheets = google.sheets({ version: 'v4', auth });

  const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const sheetName = sheetInfo.data.sheets[0].properties.title;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: sheetName,
  });

  const values = response.data.values;
  if (!values || values.length === 0) return [];

  const headers = values[0];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const rowArray = values[i];
    const rowObj = {};
    headers.forEach((header, index) => {
      rowObj[header] = rowArray[index] !== undefined ? rowArray[index] : '';
    });
    rows.push(rowObj);
  }

  return rows;
}

/**
 * Remaps raw sheet JSON headers to standard CRM headers, injects static fields.
 * @param {Array<Object>} rows - The raw JSON rows from fetchSheetRows
 * @param {object} headerMap - Object mapping original header names to new header names
 * @param {object} injectedFields - Key-value pairs to inject into every row
 * @returns {Array<Object>} - The new JSON rows
 */
function remapHeaders(rows, headerMap, injectedFields = {}) {
  return rows.map(row => {
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
}

// Automated sync for Google Sheets to Inquiries
async function syncGoogleSheetsToInquiries() {

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
      // 1. Fetch JSON rows directly
      const rawRows = await fetchSheetRows(sheet.id, auth);

      console.log(JSON.stringify({
        severity: 'INFO',
        message: 'Google Sheet fetched',
        sheet: sheet.name,
        totalRawRows: rawRows.length,
        timestamp: new Date().toISOString()
      }));

      // 2. Remap headers
      const remappedRows = remapHeaders(
        rawRows,
        sheet.headerMap,
        { Source: sheet.source }
      );

      console.log(JSON.stringify({
        severity: 'INFO',
        message: 'Headers remapped',
        sheet: sheet.name,
        remappedRowsCount: remappedRows.length,
        timestamp: new Date().toISOString()
      }));

      // 3. Validate rows
      const { summary, rows: previewRows } = await validateInquiryRows(remappedRows);

      // Log validation classification breakdown
      console.log(JSON.stringify({
        severity: 'INFO',
        message: 'Validation classification breakdown',
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

      // 4. Insert records
      const result = await insertInquiryRows(previewRows, {
        type: 'SYSTEM',
        name: 'Google Sheets Background Sync'
      });

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
  fetchSheetRows,
  remapHeaders,
  syncGoogleSheetsToInquiries
};

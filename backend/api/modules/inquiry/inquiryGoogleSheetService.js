const { google } = require('googleapis');
const auth = require('../../../config/googleAuth');
const prisma = require('../../../config/db');
const { sheetInquirySyncSchema, sanitizeSheetMobile } = require('./inquirySchemas');
const {
  normalizeEnum,
  PROVINCE_MAP,
  normalizeProvinceName,
  removeVietnameseTones
} = require('../../utils/enumMapper');
const { resolveHierarchy, normalizeHierarchyText } = require('../../utils/hierarchyUtils');

// !--- Province-Group Rules for Google Sheets automated intake ---! //
const TIER_1_PROVINCES = new Set([
  'thanh pho ho chi minh',
  'binh duong',
  'ba ria - vung tau'
]);

const TIER_2_PROVINCES = new Set([
  'dong nai',
  'lam dong',
  'khanh hoa',
  'tien giang',
  'long an',
  'tay ninh',
  'dak lak',
  'ben tre',
  'binh thuan',
  'binh phuoc'
]);

/**
 * Derives the Province Group strictly for Google Sheets sync leads.
 * - TP. Hồ Chí Minh, Bình Dương, Vũng Tàu -> HO_CHI_MINH (TP HCM)
 * - Đồng Nai, Lâm Đồng, Khánh Hòa, Tiền Giang, Long An, Tây Ninh, ĐakLak, Bến Tre, Bình Thuận, Bình Phước -> CORE_PROVINCE (Tỉnh ruột)
 * - Other old provinces  -> OTHER_PROVINCE (Tỉnh ngoài)
 * - Unrecognized/international/foreign text -> FOREIGN (Nước ngoài)
 */
const resolveProvinceGroup = (provinceInput, oldProvinces = []) => {
  if (!provinceInput) return 'FOREIGN';

  // If already matches an enum value directly or mapped enum
  const enumNorm = normalizeEnum(provinceInput);
  if (PROVINCE_MAP[enumNorm]) {
    return PROVINCE_MAP[enumNorm];
  }

  const normalized = normalizeProvinceName(provinceInput);
  if (!normalized) return 'FOREIGN';

  if (TIER_1_PROVINCES.has(normalized)) {
    return 'HO_CHI_MINH';
  }

  if (TIER_2_PROVINCES.has(normalized)) {
    return 'CORE_PROVINCE';
  }

  // Check if matched in database oldProvinces
  if (Array.isArray(oldProvinces) && oldProvinces.length > 0) {
    const matchedDomestic = oldProvinces.some(op => {
      const opName = typeof op === 'string' ? op : (op.name || '');
      const opNorm = normalizeProvinceName(opName);
      return opNorm === normalized || opName.toLowerCase() === String(provinceInput).toLowerCase().trim();
    });

    if (matchedDomestic) {
      return 'OTHER_PROVINCE';
    }
    return 'FOREIGN';
  }

  return 'OTHER_PROVINCE';
};

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
      const val = rowArray[index] !== undefined ? String(rowArray[index]).trim() : '';
      if (rowObj[header] === undefined || (!rowObj[header] && val)) {
        rowObj[header] = val;
      }
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
      } else {
        newRow[originalKey] = value;
      }
    }

    // Inject static fields
    for (const [key, value] of Object.entries(injectedFields)) {
      newRow[key] = value;
    }

    return newRow;
  });
}

/**
 * Validates and infers inquiry fields specifically for Google Sheets synchronization.
 * Applies Title Case names, 10-digit mobile validation (^0\d{9}$), 4-tier Province Group derivation,
 * default initial status assignment, and source mapping.
 *
 * @param {Array<Object>} rawData
 * @param {Object} [sheetMetadata]
 * @returns {Promise<{ summary: Object, rows: Array<Object> }>}
 */
async function validateSheetInquiryRows(rawData, sheetMetadata = {}) {
  if (!rawData || rawData.length === 0) {
    return {
      summary: { total: 0, readyNew: 0, readyExisting: 0, existingInquiry: 0, duplicateInFile: 0, mappingIssue: 0, invalid: 0 },
      rows: []
    };
  }

  // Pre-load reference collections
  const oldProvinces = await prisma.oldProvince.findMany();
  const schools = await prisma.school.findMany();
  const newProvinces = await prisma.newProvince.findMany();
  const countries = await prisma.country.findMany();
  const majorData = await prisma.majorData.findMany({ where: { isActive: true } });
  const statusData = await prisma.statusData.findMany({
    where: { isActive: true },
    orderBy: [
      { parentId: 'asc' },
      { sortOrder: 'asc' }
    ]
  });
  const defaultInitialStatus = statusData.find(s => !s.parentId);
  const sourceData = await prisma.sourceData.findMany({ where: { isActive: true } });

  const fallbackNewProvinceId = newProvinces.length > 0 ? newProvinces[0].id : null;
  const fallbackCountryId = countries.length > 0 ? countries[0].id : null;

  // 1. Parse each row, applying Zod schema validation & transformations
  const mobileMap = new Map();
  const parsedRows = rawData.map((row, index) => {
    const r = {
      _meta: {
        rowNumber: index + 2,
        errors: [],
        warnings: [],
        raw: row,
        classification: null
      }
    };

    const rawFullName = row.fullName || row['Full Name'] || row['Name'] || row['Họ và tên'] || '';
    const rawMobile = row.mobile || row['Mobile'] || row['Phone'] || row['Số điện thoại'] || '';
    const rawEmail = row.email || row['Email'] || '';
    const rawSchool = row.school || row['School'] || row['Trường THPT'] || '';
    const rawLocation = row.location || row['Old Province'] || row.oldProvince || row['Address'] || row['Tỉnh/thành'] || row['Primary Address'] || '';
    const rawCourse = row.course || row['Course'] || row['Specific Major'] || row.specificMajor || row['Interested Major'] || row.interestedMajor || '';
    const rawSourceDetail = row.sourceDetail || row['Source Detail'] || row['UTM-medium'] || row['UTM-campaign'] || '';
    const rawApproachMethod = row.approachMethod || row['Approach Method'] || row['UTM-name'] || '';
    const rawClass = row.class || row['Class'] || row['Lớp'] || '';
    const rawSource = row.source || row['Source'] || sheetMetadata.source || 'Online';

    r.school = typeof rawSchool === 'string' ? rawSchool.trim() : rawSchool;
    r.sourceDetail = typeof rawSourceDetail === 'string' ? rawSourceDetail.trim() : rawSourceDetail;
    r.approachMethod = typeof rawApproachMethod === 'string' ? rawApproachMethod.trim() : rawApproachMethod;
    r.class = typeof rawClass === 'string' ? rawClass.trim() : rawClass;
    r.source = typeof rawSource === 'string' ? rawSource.trim() : rawSource;
    r.location = typeof rawLocation === 'string' ? rawLocation.trim() : rawLocation;
    r.course = typeof rawCourse === 'string' ? rawCourse.trim() : rawCourse;

    // Strict domain Zod validation
    const syncParse = sheetInquirySyncSchema.safeParse({
      fullName: rawFullName,
      mobile: rawMobile,
      email: rawEmail || undefined,
      primaryAddress: r.location || undefined
    });

    if (!syncParse.success) {
      syncParse.error.issues.forEach(issue => {
        r._meta.errors.push(`${issue.path.join('.') || 'field'}: ${issue.message}`);
      });
      r._meta.classification = 'INVALID';
      r.mobile = sanitizeSheetMobile(rawMobile) || (typeof rawMobile === 'string' ? rawMobile.trim() : rawMobile);
      r.fullName = typeof rawFullName === 'string' ? rawFullName.trim() : rawFullName;
      r.email = rawEmail ? String(rawEmail).trim() : null;
    } else {
      r.fullName = syncParse.data.fullName; // Title Case format
      r.mobile = syncParse.data.mobile;     // Exactly 10 digits starting with 0
      r.email = syncParse.data.email || null;
    }

    // Intra-batch duplicate tracking
    if (r.mobile) {
      if (mobileMap.has(r.mobile)) {
        r._meta.classification = 'DUPLICATE_IN_FILE';
        r._meta.errors.push(`Mobile ${r.mobile} is duplicated in file (first seen row ${mobileMap.get(r.mobile)})`);
      } else {
        mobileMap.set(r.mobile, r._meta.rowNumber);
      }
    } else if (!r._meta.classification) {
      r._meta.errors.push('Mobile is required for every row');
      r._meta.classification = 'INVALID';
    }

    return r;
  });

  // 2. Query database for existing students by mobile
  const distinctMobiles = [...new Set(parsedRows.map(r => r.mobile).filter(Boolean))];
  const existingStudents = await prisma.student.findMany({
    where: { mobile: { in: distinctMobiles } },
    include: { inquiry: true }
  });

  // 3. Process geographic derivation, source mapping, and status assignment
  for (const row of parsedRows) {
    if (row._meta.classification) {
      continue; // Skip if already classified (DUPLICATE_IN_FILE or INVALID)
    }

    const student = existingStudents.find(s => s.mobile === row.mobile);

    if (student) {
      if (student.inquiry) {
        row._meta.classification = 'EXISTING_INQUIRY';
        continue;
      } else {
        row._meta.classification = 'READY_EXISTING_STUDENT_NEW_INQUIRY';
        row.existingStudentId = student.id;
      }
    } else {
      row._meta.classification = 'READY_NEW_STUDENT_AND_INQUIRY';
    }

    // Derive 4-Tier Province Group (HO_CHI_MINH, CORE_PROVINCE, OTHER_PROVINCE, FOREIGN)
    const rawLoc = row.location || '';
    row.provinceGroup = resolveProvinceGroup(rawLoc, oldProvinces);

    if (rawLoc) {
      const provNorm = normalizeProvinceName(rawLoc);
      const matchedProv = oldProvinces.find(p => {
        const pNorm = normalizeProvinceName(p.name);
        return pNorm === provNorm || p.name.toLowerCase() === rawLoc.toLowerCase();
      });

      if (matchedProv) {
        row.oldProvinceId = matchedProv.id;
        if (row.school) {
          const cleanSchool = (s) => removeVietnameseTones(String(s))
            .toLowerCase()
            .replace(/^(truong\s+thpt|thpt|truong\s+ptth|ptth|truong)\s+/i, '')
            .replace(/[\.\-_]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          const schoolNorm = cleanSchool(row.school);
          const sch = schools.find(s => {
            if (s.oldProvinceId !== matchedProv.id) return false;
            return s.name.toLowerCase() === String(row.school).toLowerCase().trim() || cleanSchool(s.name) === schoolNorm;
          });
          if (sch) {
            row.schoolId = sch.id;
          }
        }
      } else {
        // Unrecognized domestic or foreign text
        row.provinceGroup = 'FOREIGN';
      }
    }
    row.primaryAddress = row.primaryAddress || rawLoc || null;

    row.newProvinceId = fallbackNewProvinceId;
    row.countryId = fallbackCountryId;

    // Course / Major resolution
    if (row.course) {
      const normalizeMajorText = (txt) => {
        if (!txt) return '';
        return removeVietnameseTones(String(txt))
          .toLowerCase()
          .replace(/y/g, 'i')
          .replace(/[\s\-_]+/g, ' ')
          .trim();
      };

      const cNorm = normalizeMajorText(row.course);
      const matchedMajor = majorData.find(m => {
        const lNorm = normalizeMajorText(m.label);
        const nNorm = normalizeMajorText(m.name);
        return lNorm === cNorm || nNorm === cNorm;
      });

      if (matchedMajor) {
        if (matchedMajor.parentId) {
          row.interestedMajorId = matchedMajor.parentId;
          row.specificMajorId = matchedMajor.id;
        } else {
          row.interestedMajorId = matchedMajor.id;
          const firstChild = majorData.find(m => m.parentId === matchedMajor.id);
          row.specificMajorId = firstChild ? firstChild.id : matchedMajor.id;
        }
      }
    }

    // Default initial intake status (e.g. Pending, sortOrder = 1)
    if (defaultInitialStatus) {
      row.statusDataId = defaultInitialStatus.id;
    }

    // Resolve source data (Online / Offline)
    const targetSource = row.source || 'Online';
    const rootSrc = sourceData.find(s => !s.parentId && normalizeHierarchyText(s.label) === normalizeHierarchyText(targetSource));

    if (row.sourceDetail || row.approachMethod) {
      const srcRes = resolveHierarchy(sourceData, ['source', 'sourceDetail', 'approachMethod'], [targetSource, row.sourceDetail, row.approachMethod]);
      if (!srcRes.error && srcRes.resolvedId) {
        row.sourceDataId = srcRes.resolvedId;
      } else if (rootSrc) {
        row.sourceDataId = rootSrc.id;
      }
    } else if (rootSrc) {
      row.sourceDataId = rootSrc.id;
    }
  }

  const summary = {
    total: parsedRows.length,
    readyNew: parsedRows.filter(r => r._meta.classification === 'READY_NEW_STUDENT_AND_INQUIRY').length,
    readyExisting: parsedRows.filter(r => r._meta.classification === 'READY_EXISTING_STUDENT_NEW_INQUIRY').length,
    existingInquiry: parsedRows.filter(r => r._meta.classification === 'EXISTING_INQUIRY').length,
    duplicateInFile: parsedRows.filter(r => r._meta.classification === 'DUPLICATE_IN_FILE').length,
    mappingIssue: parsedRows.filter(r => r._meta.classification === 'MAPPING_ISSUE').length,
    invalid: parsedRows.filter(r => r._meta.classification === 'INVALID').length
  };

  return { summary, rows: parsedRows };
}

/**
 * Persists validated Google Sheets rows using atomic per-row transactions.
 * Guarantees zero orphaned student records on failure.
 *
 * @param {Array<Object>} rows
 * @param {Object} [context]
 * @returns {Promise<{ newStudentsCreated: number, newInquiriesForExisting: number, skipped: number }>}
 */
async function insertSheetInquiryRows(rows, context = { type: 'SYSTEM', name: 'Google Sheets Background Sync' }) {
  let newStudentsCreated = 0;
  let newInquiriesForExisting = 0;
  let skipped = 0;

  for (const row of rows) {
    if (row._meta.classification === 'READY_NEW_STUDENT_AND_INQUIRY') {
      try {
        await prisma.$transaction(async (tx) => {
          let srId = null;
          // 1. Create SpecializedRegister if academic intentions provided
          if (row.interestedMajorId && row.specificMajorId) {
            const sr = await tx.specializedRegister.create({
              data: {
                interestedMajorId: row.interestedMajorId,
                specificMajorId: row.specificMajorId,
                admissionYear: null,
                englishCertificate: null,
                gpa: 'OTHER',
                programScore: 'OTHER'
              }
            });
            srId = sr.id;
          }

          // 2. Create Student record
          const student = await tx.student.create({
            data: {
              fullName: row.fullName,
              gender: 'Unknown',
              email: row.email || null,
              mobile: row.mobile,
              otherPhone: null,
              birthDate: null,
              primaryAddress: row.primaryAddress || null,
              specializedRegisterId: srId
            }
          });

          let npId = row.newProvinceId;
          let cId = row.countryId;
          if (!npId || !cId) {
            const defaultNp = await tx.newProvince.findFirst();
            const defaultC = await tx.country.findFirst();
            npId = npId || defaultNp?.id;
            cId = cId || defaultC?.id;
          }

          // 3. Create StudentEducation record with derived provinceGroup
          await tx.studentEducation.create({
            data: {
              studentId: student.id,
              schoolId: row.schoolId || null,
              newProvinceId: npId,
              countryId: cId,
              provinceGroup: row.provinceGroup || 'OTHER_PROVINCE',
              schoolType: 'D',
              class: 'GRADE_12'
            }
          });

          // 4. Create active Inquiry record linked to student
          await tx.inquiry.create({
            data: {
              assignedToId: null,
              description: null,
              dataReceived: new Date(),
              groupTele: null,
              priority: null,
              statusDataId: row.statusDataId || null,
              sourceDataId: row.sourceDataId || null,
              studentId: student.id
            }
          });
        });
        newStudentsCreated++;
      } catch (err) {
        console.error(JSON.stringify({
          severity: 'ERROR',
          message: `Transaction failed for sheet sync row ${row._meta.rowNumber}`,
          rowNumber: row._meta.rowNumber,
          mobile: row.mobile,
          error: err.message || err,
          timestamp: new Date().toISOString()
        }));
        skipped++;
      }
    } else if (row._meta.classification === 'READY_EXISTING_STUDENT_NEW_INQUIRY') {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.inquiry.create({
            data: {
              assignedToId: null,
              description: null,
              dataReceived: new Date(),
              groupTele: null,
              priority: null,
              statusDataId: row.statusDataId || null,
              sourceDataId: row.sourceDataId || null,
              studentId: row.existingStudentId
            }
          });
        });
        newInquiriesForExisting++;
      } catch (err) {
        console.error(JSON.stringify({
          severity: 'ERROR',
          message: `Transaction failed for existing student sheet row ${row._meta.rowNumber}`,
          rowNumber: row._meta.rowNumber,
          mobile: row.mobile,
          error: err.message || err,
          timestamp: new Date().toISOString()
        }));
        skipped++;
      }
    } else {
      skipped++;
    }
  }

  return {
    newStudentsCreated,
    newInquiriesForExisting,
    skipped
  };
}

/**
 * Automated sync for Google Sheets to Inquiries.
 */
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

  const results = [];

  for (const sheet of sheetsToSync) {
    if (!sheet.id) {
      console.error(JSON.stringify({
        severity: 'ERROR',
        message: 'Missing environment variable for sheet ID',
        sheet: sheet.name,
        error: `Missing environment variable for sheet ID`,
        timestamp: new Date().toISOString()
      }));
      results.push({
        sheet: sheet.name,
        status: 'SKIPPED',
        error: 'Missing environment variable for sheet ID'
      });
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

      // 3. Validate rows specifically for Google Sheets sync
      const { summary, rows: previewRows } = await validateSheetInquiryRows(remappedRows, { source: sheet.source, sheetName: sheet.name });

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

      // 4. Insert records using atomic per-row transactions
      const result = await insertSheetInquiryRows(previewRows, {
        type: 'SYSTEM',
        name: `Google Sheets Background Sync: ${sheet.name}`
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

      results.push({
        sheet: sheet.name,
        status: 'SUCCESS',
        totalRawRows: rawRows.length,
        newStudentsCreated: result.newStudentsCreated,
        newInquiriesForExisting: result.newInquiriesForExisting,
        skipped: result.skipped
      });

    } catch (error) {
      console.error(JSON.stringify({
        severity: 'ERROR',
        message: 'Error during sheet sync',
        sheet: sheet.name,
        error: error.message || error,
        timestamp: new Date().toISOString()
      }));
      results.push({
        sheet: sheet.name,
        status: 'ERROR',
        error: error.message || error
      });
    }
  }

  return results;
}

module.exports = {
  HEADER_MAP_WEB_HCM,
  HEADER_MAP_MULTIPLE_CHOICE,
  fetchSheetRows,
  remapHeaders,
  validateSheetInquiryRows,
  insertSheetInquiryRows,
  syncGoogleSheetsToInquiries,
  resolveProvinceGroup
};

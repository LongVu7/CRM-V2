const { google } = require('googleapis');
const auth = require('../../../config/googleAuth');
const prisma = require('../../../config/db');
const { sheetLeadSyncSchema, sanitizeSheetMobile } = require('./leadSchemas');
const {
  normalizeEnum,
  PROVINCE_MAP,
  CLASS_MAP,
  normalizeProvinceName,
  removeVietnameseTones,
  PROVINCE_GROUP_RULES
} = require('../../utils/enumMapper');
const { resolveHierarchy, normalizeHierarchyText } = require('../../utils/taxonomyHierarchy');

// !!-- PROVINCE GROUP CONFIGURATION -- !
// HO_CHI_MINH    → TP HCM khu vực (TP.HCM, Bình Dương, Vũng Tàu)
// CORE_PROVINCE  → Tỉnh ruột (Đồng Nai, Lâm Đồng, Khánh Hòa, ...)
// OTHER_PROVINCE → Tỉnh ngoài (any recognized domestic province not in Tier 1/2)
// FOREIGN        → Nước ngoài (unrecognized from oldProvince)

/**
 * Derives the Province Group for a given province text input.
 *
 * Resolution order:
 *   1. Direct enum match (PROVINCE_MAP from enumMapper)
 *   2. Normalized name match against PROVINCE_GROUP_RULES
 *   3. Match against database oldProvinces → OTHER_PROVINCE
 *   4. Fallback → FOREIGN
 */
const resolveProvinceGroup = (provinceInput, oldProvinces = []) => {
  if (!provinceInput) return 'FOREIGN';

  // Direct enum match
  const enumNorm = normalizeEnum(provinceInput);
  if (PROVINCE_MAP[enumNorm]) {
    return PROVINCE_MAP[enumNorm];
  }

  const normalized = normalizeProvinceName(provinceInput);
  if (!normalized) return 'FOREIGN';

  // Check data-driven rules
  if (PROVINCE_GROUP_RULES[normalized]) {
    return PROVINCE_GROUP_RULES[normalized];
  }

  // Check if it matches a known domestic province in DB
  if (Array.isArray(oldProvinces) && oldProvinces.length > 0) {
    const matchedDomestic = oldProvinces.some(op => {
      const opName = typeof op === 'string' ? op : (op.name || '');
      const opNorm = normalizeProvinceName(opName);
      return opNorm === normalized || opName.toLowerCase() === String(provinceInput).toLowerCase().trim();
    });

    return matchedDomestic ? 'OTHER_PROVINCE' : 'FOREIGN';
  }

  return 'OTHER_PROVINCE';
};

//SHEET CONFIGURATION REGISTRY
//
// Each sheet definition describes:
//   - envVar: environment variable name for the Google Sheet ID
//   - name:   internal identifier used in logs
//   - headerMap: maps raw sheet column names → standard CRM field names
//   - source: default source value ('Online' or 'Offline')

const HEADER_MAP_WEB_HCM = {
  'Name': 'Full Name',
  'Phone': 'Mobile',
  'Email': 'Email',
  'School': 'School',
  'Address': 'Primary Address',
  'Course': 'Specific Major',
  'UTM-medium': 'Source Detail',
  'UTM-name': 'Approach Method',
  'Address Province': 'Old Province'
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

const SHEETS_REGISTRY = [
  {
    envVar: 'GOOGLE_SHEET_ID_WEB_HCM',
    name: 'WEB_HCM',
    headerMap: HEADER_MAP_WEB_HCM,
    source: 'Online'
  },
  {
    envVar: 'GOOGLE_SHEET_ID_MULTIPLE_CHOICE',
    name: 'MULTIPLE_CHOICE',
    headerMap: HEADER_MAP_MULTIPLE_CHOICE,
    source: 'Offline'
  }
];

// GOOGLE SHEETS API 
/**
 * Fetches all data rows from the first tab of a Google Sheet.
 * Returns an array of objects keyed by header names.
 */
async function fetchSheetRows(sheetId, authClient) {
  const sheets = google.sheets({ version: 'v4', auth: authClient });

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
    // Skip empty rows
    if (!rowArray || rowArray.every(val => !val || String(val).trim() === '')) {
      continue;
    }

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
 * Remaps raw sheet column names to standard CRM field names and injects static fields.
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

//REFERENCE DATA & FIELD EXTRACTION

/**
 * Pre-loads all reference data needed for validation from the database.
 * All queries run in parallel for performance.
 */
async function fetchReferenceData() {
  const [oldProvinces, schools, fallbackCountry, majorData, statusData, sourceData] =
    await Promise.all([
      prisma.oldProvince.findMany(),
      prisma.school.findMany(),
      prisma.country.findFirst({
        where: { name: { contains: 'Viet', mode: 'insensitive' } },
        select: { id: true }
      }).then(c => c || prisma.country.findFirst({ select: { id: true } })),
      prisma.majorData.findMany({ where: { isActive: true } }),
      prisma.statusData.findMany({
        where: { isActive: true },
        orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }]
      }),
      prisma.sourceData.findMany({ where: { isActive: true } })
    ]);

  return {
    oldProvinces,
    schools,
    majorData,
    sourceData,
    defaultInitialStatus: statusData.find(s => !s.parentId),
    fallbackCountryId: fallbackCountry?.id || null
  };
}

/**
 * Extracts and trims raw field values from a sheet row.
 * Handles multiple possible header names (English / Vietnamese / camelCase).
 */
function extractRawFields(row, sheetMetadata) {
  const pick = (...keys) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== '') return row[k];
    }
    return '';
  };

  const trimVal = (v) => (typeof v === 'string' ? v.trim() : v);

  return {
    fullName: pick('fullName', 'Full Name', 'Name', 'Họ và tên'),
    mobile: pick('mobile', 'Mobile', 'Phone', 'Số điện thoại'),
    email: pick('email', 'Email'),
    school: trimVal(pick('school', 'School', 'Trường THPT')),
    primaryAddress: trimVal(pick('Primary Address', 'primaryAddress')),
    location: trimVal(pick('Old Province', 'oldProvince', 'Address Province', 'Tỉnh/thành', 'location')),
    course: trimVal(pick('course', 'Course', 'Specific Major', 'specificMajor', 'Interested Major', 'interestedMajor')),
    sourceDetail: trimVal(pick('sourceDetail', 'Source Detail', 'UTM-medium', 'UTM-campaign')),
    approachMethod: trimVal(pick('approachMethod', 'Approach Method', 'UTM-name')),
    class: trimVal(pick('class', 'Class', 'Lớp')),
    source: trimVal(pick('source', 'Source') || sheetMetadata.source || 'Online'),
    schoolType: row.schoolType || ''
  };
}

//  ROW VALIDATION & CLASSIFICATION

/**
 * Validates core identity fields (fullName, mobile, email) via Zod schema.
 * Populates `_meta.errors` and sets classification to INVALID on failure.
 */
function parseAndValidateRow(r, raw) {
  const syncParse = sheetLeadSyncSchema.safeParse({
    fullName: raw.fullName,
    mobile: raw.mobile,
    email: raw.email || undefined,
    primaryAddress: r.primaryAddress || undefined,
    oldProvince: r.location || undefined
  });

  if (!syncParse.success) {
    syncParse.error.issues.forEach(issue => {
      r._meta.errors.push(`${issue.path.join('.') || 'field'}: ${issue.message}`);
    });
    r._meta.classification = 'INVALID';
    r.mobile = sanitizeSheetMobile(raw.mobile) || (typeof raw.mobile === 'string' ? raw.mobile.trim() : raw.mobile);
    r.fullName = typeof raw.fullName === 'string' ? raw.fullName.trim() : raw.fullName;
    r.email = raw.email ? String(raw.email).trim() : null;
  } else {
    r.fullName = syncParse.data.fullName; // Title Case format
    r.mobile = syncParse.data.mobile;     // Exactly 10 digits starting with 0
    r.email = syncParse.data.email || null;
  }
}

/**
 * Tracks intra-batch duplicate mobiles.
 * Marks the row as DUPLICATE_IN_FILE or INVALID when appropriate.
 */
function checkDuplicateMobile(r, mobileMap) {
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
}

/**
 * Classifies row based on whether the student/lead already exists in DB.
 *
 * Results:
 *   READY_NEW_STUDENT_AND_LEAD       → student does not exist
 *   READY_EXISTING_STUDENT_NEW_LEAD  → student exists, no lead yet
 *   EXISTING_LEAD                    → student + lead both exist
 */
function classifyByExistingStudent(row, existingStudents) {
  const student = existingStudents.find(s => s.mobile === row.mobile);

  if (student) {
    row.existingStudentId = student.id;
    row.existingStudent = student;
    row._meta.classification = student.lead
      ? 'EXISTING_LEAD'
      : 'READY_EXISTING_STUDENT_NEW_LEAD';
  } else {
    row._meta.classification = 'READY_NEW_STUDENT_AND_LEAD';
  }
}

// DOMAIN RESOLUTION HELPERS
/**
 * Resolves Province Group and oldProvinceId from location text.
 */
function resolveProvince(row, oldProvinces) {
  const rawLoc = row.location || '';
  row.provinceGroup = resolveProvinceGroup(rawLoc, oldProvinces);

  if (!rawLoc) return null;

  const provNorm = normalizeProvinceName(rawLoc);
  const matchedProv = oldProvinces.find(p => {
    const pNorm = normalizeProvinceName(p.name);
    return pNorm === provNorm || p.name.toLowerCase() === rawLoc.toLowerCase();
  });

  if (matchedProv) {
    row.oldProvinceId = matchedProv.id;
  } else {
    // Unrecognized domestic or foreign text
    row.provinceGroup = 'FOREIGN';
  }

  return matchedProv;
}

/**
 * Fuzzy-matches the school name within the matched province.
 * Strips common prefixes (THPT, Trường, PTTH) for comparison.
 */
function resolveSchool(row, matchedProv, schools) {
  if (!matchedProv || !row.school) return;

  const cleanSchool = (s) => removeVietnameseTones(String(s))
    .toLowerCase()
    .replace(/^(truong\s+thpt|thpt|truong\s+ptth|ptth|truong)\s+/i, '')
    .replace(/[\.\-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const schoolNorm = cleanSchool(row.school);
  const sch = schools.find(s => {
    if (s.oldProvinceId !== matchedProv.id) return false;
    return s.name.toLowerCase() === String(row.school).toLowerCase().trim()
      || cleanSchool(s.name) === schoolNorm;
  });

  if (sch) {
    row.schoolId = sch.id;
  }
}

/**
 * Matches course text to majorData hierarchy.
 * Sets interestedMajorId (parent) and specificMajorId (child or self).
 */
function resolveMajor(row, majorData) {
  if (!row.course) return;

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

  if (!matchedMajor) return;

  if (matchedMajor.parentId) {
    row.interestedMajorId = matchedMajor.parentId;
    row.specificMajorId = matchedMajor.id;
  } else {
    row.interestedMajorId = matchedMajor.id;
    const firstChild = majorData.find(m => m.parentId === matchedMajor.id);
    row.specificMajorId = firstChild ? firstChild.id : matchedMajor.id;
  }
}

/**
 * Resolves sourceDataId from hierarchical source tree.
 * Hierarchy: source → sourceDetail → approachMethod
 */
function resolveSource(row, sourceData) {
  const targetSource = row.source || 'Online';
  const rootSrc = sourceData.find(
    s => !s.parentId && normalizeHierarchyText(s.label) === normalizeHierarchyText(targetSource)
  );

  if (row.sourceDetail || row.approachMethod) {
    const srcRes = resolveHierarchy(
      sourceData,
      ['source', 'sourceDetail', 'approachMethod'],
      [targetSource, row.sourceDetail, row.approachMethod]
    );
    if (!srcRes.error && srcRes.resolvedId) {
      row.sourceDataId = srcRes.resolvedId;
    } else if (rootSrc) {
      row.sourceDataId = rootSrc.id;
    }
  } else if (rootSrc) {
    row.sourceDataId = rootSrc.id;
  }
}

/**
 * Maps raw class text to enum: GRADE_11 / GRADE_12 / FREELANCE / NONE.
 */
function resolveClassEnum(row) {
  if (!row.class) {
    row.resolvedClass = 'NONE';
    return;
  }

  const normClass = normalizeEnum(row.class);
  const VALID_CLASS_ENUMS = ['GRADE_11', 'GRADE_12', 'FREELANCE', 'NONE'];

  row.resolvedClass = CLASS_MAP[normClass]
    || (normClass === '12' ? 'GRADE_12'
      : (normClass === '11' ? 'GRADE_11'
        : (VALID_CLASS_ENUMS.includes(normClass) ? normClass : 'NONE')));
}

/**
 * Maps raw school type text to enum: A_STAR / A / B / C / D / NONE.
 */
function resolveSchoolTypeEnum(row) {
  if (!row.schoolType) {
    row.resolvedSchoolType = 'NONE';
    return;
  }

  let normST = normalizeEnum(row.schoolType);
  if (normST === 'A_') normST = 'A_STAR';

  const VALID_SCHOOL_TYPES = ['A_STAR', 'A', 'B', 'C', 'D', 'NONE'];
  row.resolvedSchoolType = VALID_SCHOOL_TYPES.includes(normST) ? normST : 'NONE';
}

// ═══════════════════════════════════════════════════════════════════════════════
// §7. VALIDATION ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

const EMPTY_SUMMARY = {
  total: 0, readyNew: 0, readyExisting: 0,
  existingLead: 0, duplicateInFile: 0, mappingIssue: 0, invalid: 0
};

const CLASSIFICATION_KEYS = [
  ['readyNew', 'READY_NEW_STUDENT_AND_LEAD'],
  ['readyExisting', 'READY_EXISTING_STUDENT_NEW_LEAD'],
  ['existingLead', 'EXISTING_LEAD'],
  ['duplicateInFile', 'DUPLICATE_IN_FILE'],
  ['mappingIssue', 'MAPPING_ISSUE'],
  ['invalid', 'INVALID']
];

/**
 * Counts rows per classification bucket.
 */
function buildSummary(parsedRows) {
  const summary = { total: parsedRows.length };
  for (const [key, value] of CLASSIFICATION_KEYS) {
    summary[key] = parsedRows.filter(r => r._meta.classification === value).length;
  }
  return summary;
}

/**
 * Validates and enriches lead rows for Google Sheets synchronization.
 *
 * Pipeline:
 *   1. Extract & validate raw fields (Zod schema)
 *   2. Detect intra-batch duplicate mobiles
 *   3. Classify by existing student/lead in DB
 *   4. Resolve geography (province → school)
 *   5. Resolve academics (major, class, school type)
 *   6. Resolve source hierarchy & default status
 *
 * @param {Object[]} rawData - Array of raw row objects from the sheet
 * @param {Object} sheetMetadata - Sheet-level metadata (source, sheetName)
 * @returns {{ summary: Object, rows: Object[] }}
 */
async function validateSheetLeadRows(rawData, sheetMetadata = {}) {
  if (!rawData || rawData.length === 0) {
    return { summary: { ...EMPTY_SUMMARY }, rows: [] };
  }

  // ── Step 0: Load all reference data in parallel ──
  const refData = await fetchReferenceData();

  // ── Step 1: Parse & validate each row ──
  const mobileMap = new Map();
  const parsedRows = rawData.map((row, index) => {
    const raw = extractRawFields(row, sheetMetadata);

    const r = {
      _meta: {
        rowNumber: index + 2,
        errors: [],
        warnings: [],
        raw: row,
        classification: null
      },
      school: raw.school,
      sourceDetail: raw.sourceDetail,
      approachMethod: raw.approachMethod,
      class: raw.class,
      source: raw.source,
      location: raw.location,
      primaryAddress: raw.primaryAddress,
      course: raw.course,
      schoolType: raw.schoolType
    };

    parseAndValidateRow(r, raw);
    checkDuplicateMobile(r, mobileMap);

    return r;
  });

  // ── Step 2: Batch-query existing students by mobile ──
  const distinctMobiles = [...new Set(parsedRows.map(r => r.mobile).filter(Boolean))];
  const existingStudents = await prisma.student.findMany({
    where: { mobile: { in: distinctMobiles } },
    include: { lead: true }
  });

  // ── Step 3: Enrich each non-classified row ──
  for (const row of parsedRows) {
    if (row._meta.classification) continue; // Already INVALID or DUPLICATE_IN_FILE

    // 3a. Classify by existing student/lead
    classifyByExistingStudent(row, existingStudents);

    // 3b. Geography: Province Group + Old Province + School
    const matchedProv = resolveProvince(row, refData.oldProvinces);
    resolveSchool(row, matchedProv, refData.schools);

    row.primaryAddress = row.primaryAddress || null;
    row.newProvinceId = null;
    row.countryId = refData.fallbackCountryId;

    // 3c. Academics: Major, Class, School Type
    resolveMajor(row, refData.majorData);
    resolveClassEnum(row);
    resolveSchoolTypeEnum(row);

    // 3d. Default status
    if (refData.defaultInitialStatus) {
      row.statusDataId = refData.defaultInitialStatus.id;
    }

    // 3e. Source hierarchy
    resolveSource(row, refData.sourceData);
  }

  return { summary: buildSummary(parsedRows), rows: parsedRows };
}


/**
 * Builds the StudentEducation data payload used for both create and reference.
 */
function buildEducationData(studentId, row) {
  const data = {
    schoolId: row.schoolId || null,
    oldProvinceId: row.oldProvinceId || null,
    newProvinceId: row.newProvinceId || null,
    countryId: row.countryId,
    provinceGroup: row.provinceGroup || 'OTHER_PROVINCE',
    schoolType: row.resolvedSchoolType || 'NONE',
    class: row.resolvedClass || 'NONE'
  };
  if (studentId) data.studentId = studentId;
  return data;
}

/**
 * Builds the Lead data payload.
 * Adds lead notes informing users if the input school/old province was not found in the DB.
 */
function buildLeadData(row, studentId) {
  const notes = [];
  if (row.school && !row.schoolId)
    notes.push(`Missing School: ${row.school}`);
  if (row.location && !row.oldProvinceId)
    notes.push(`Missing Old Province: ${row.location}`);
  const data = {
    assignedToId: null,
    description: notes.length > 0 ? notes.join(' | ') : null,
    dataReceived: new Date(),
    priority: null,
    statusDataId: row.statusDataId || null,
    sourceDataId: row.sourceDataId || null
  };
  if (studentId) data.studentId = studentId;
  return data;
}
// ─── Row-level transaction handlers ───────────────────────────────────────────

/**
 * Creates a new Student + StudentEducation + lead (and optional SpecializedRegister).
 */
async function handleNewStudentAndLead(tx, row) {
  const studentData = {
    fullName: row.fullName,
    gender: 'Unknown',
    email: row.email || null,
    mobile: row.mobile,
    otherPhone: null,
    birthDate: null,
    primaryAddress: row.primaryAddress || null,
    education: {
      create: buildEducationData(null, row)
    },
    lead: {
      create: buildLeadData(row, null)
    }
  };

  if (row.interestedMajorId && row.specificMajorId) {
    studentData.specializedRegister = {
      create: {
        interestedMajorId: row.interestedMajorId,
        specificMajorId: row.specificMajorId,
        admissionYear: null,
        englishCertificate: null,
        gpa: 'OTHER',
        programScore: 'OTHER'
      }
    };
  }

  await tx.student.create({ data: studentData });
}

/**
 * Creates a new lead for an existing student (Insert-Only).
 */
async function handleExistingStudentNewLead(tx, row) {
  await tx.lead.create({
    data: buildLeadData(row, row.existingStudentId)
  });
}

/**
 * Persists validated Google Sheets rows using atomic per-row transactions.
 * Pure Insert-Only: existing leads and existing students are not mutated.
 */
async function insertSheetLeadRows(rows, context = { type: 'SYSTEM', name: 'Google Sheets Background Sync' }) {
  const counters = {
    newStudentsCreated: 0,
    newLeadsForExisting: 0,
    existingStudentsUpdated: 0,
    skipped: 0
  };

  /** Maps classification → { handler, counterKey } */
  const HANDLERS = {
    'READY_NEW_STUDENT_AND_LEAD': {
      handler: handleNewStudentAndLead,
      counterKey: 'newStudentsCreated'
    },
    'READY_EXISTING_STUDENT_NEW_LEAD': {
      handler: handleExistingStudentNewLead,
      counterKey: 'newLeadsForExisting'
    }
  };

  for (const row of rows) {
    const config = HANDLERS[row._meta.classification];

    if (config) {
      try {
        await prisma.$transaction(async (tx) => {
          await config.handler(tx, row);
        });
        counters[config.counterKey]++;
      } catch (err) {
        logSync('ERROR', `Transaction failed for sheet sync row ${row._meta.rowNumber}`, {
          rowNumber: row._meta.rowNumber,
          mobile: row.mobile,
          error: err.message || err
        });
        counters.skipped++;
      }
    } else {
      // EXISTING_LEAD, INVALID, DUPLICATE_IN_FILE, MAPPING_ISSUE, etc.
      counters.skipped++;
    }
  }

  return counters;
}

// !---- SYNC ORCHESTRATOR ----!

/**
 * Structured logging helper for sync operations.
 */
function logSync(severity, message, extra = {}) {
  const logFn = severity === 'ERROR' ? console.error : console.log;
  logFn(JSON.stringify({
    severity,
    message,
    ...extra,
    timestamp: new Date().toISOString()
  }));
}

/**
 * Logs classification details for problem rows (MAPPING_ISSUE, INVALID).
 */
function logProblemRows(sheetName, previewRows) {
  const PROBLEM_TYPES = [
    { classification: 'MAPPING_ISSUE', label: 'Mapping issue details' },
    { classification: 'INVALID', label: 'Invalid row details' }
  ];

  for (const { classification, label } of PROBLEM_TYPES) {
    const problemRows = previewRows.filter(r => r._meta.classification === classification);
    if (problemRows.length > 0) {
      logSync('WARNING', label, {
        sheet: sheetName,
        rows: problemRows.map(r => ({
          rowNumber: r._meta.rowNumber,
          mobile: r.mobile,
          fullName: r.fullName,
          errors: r._meta.errors
        }))
      });
    }
  }
}

/**
 * Processes a single sheet: fetch → remap → validate → insert.
 * Returns a result object for the sheet.
 */
async function processSingleSheet(sheet) {
  // 1. Fetch raw rows from Google Sheets API
  const rawRows = await fetchSheetRows(sheet.id, auth);
  logSync('INFO', 'Google Sheet fetched', {
    sheet: sheet.name,
    totalRawRows: rawRows.length
  });

  // 2. Remap headers to standard CRM field names
  const remappedRows = remapHeaders(rawRows, sheet.headerMap, { Source: sheet.source });
  logSync('INFO', 'Headers remapped', {
    sheet: sheet.name,
    remappedRowsCount: remappedRows.length
  });

  // 3. Validate and enrich rows
  const { summary, rows: previewRows } = await validateSheetLeadRows(
    remappedRows,
    { source: sheet.source, sheetName: sheet.name }
  );

  logSync('INFO', 'Validation classification breakdown', {
    sheet: sheet.name,
    totalRows: summary.total,
    readyNew: summary.readyNew,
    readyExisting: summary.readyExisting,
    existingLead: summary.existingLead,
    duplicateInFile: summary.duplicateInFile,
    mappingIssue: summary.mappingIssue,
    invalid: summary.invalid
  });

  logProblemRows(sheet.name, previewRows);

  // 4. Persist valid rows
  const result = await insertSheetLeadRows(previewRows, {
    type: 'SYSTEM',
    name: `Google Sheets Background Sync: ${sheet.name}`
  });

  logSync('INFO', 'Sync completed', {
    sheet: sheet.name,
    ...result
  });

  return {
    sheet: sheet.name,
    status: 'SUCCESS',
    totalRawRows: rawRows.length,
    ...result
  };
}

let isSyncInProgress = false;

/**
 * Main entry point: syncs all configured Google Sheets to CRM Leads.
 * Processes each sheet independently — one sheet's failure doesn't block others.
 */
async function syncGoogleSheetsToLeads() {
  if (isSyncInProgress) {
    logSync('WARN', 'Google Sheets sync already in progress, skipping trigger');
    return [{ status: 'SKIPPED', message: 'Sync already in progress' }];
  }

  isSyncInProgress = true;
  try {
    const results = [];

    for (const sheetConfig of SHEETS_REGISTRY) {
      const sheetId = process.env[sheetConfig.envVar];

      if (!sheetId) {
        logSync('INFO', 'Sheet ID not configured, skipping', {
          sheet: sheetConfig.name,
          envVar: sheetConfig.envVar
        });
        results.push({
          sheet: sheetConfig.name,
          status: 'SKIPPED',
          error: `Missing environment variable: ${sheetConfig.envVar}`
        });
        continue;
      }

      try {
        const result = await processSingleSheet({
          id: sheetId,
          name: sheetConfig.name,
          headerMap: sheetConfig.headerMap,
          source: sheetConfig.source
        });
        results.push(result);
      } catch (error) {
        logSync('ERROR', 'Error during sheet sync', {
          sheet: sheetConfig.name,
          error: error.message || error
        });
        results.push({
          sheet: sheetConfig.name,
          status: 'ERROR',
          error: error.message || error
        });
      }
    }

    return results;
  } finally {
    isSyncInProgress = false;
  }
}

module.exports = {
  syncGoogleSheetsToLeads,
  validateSheetLeadRows,
  insertSheetLeadRows,
  resolveProvinceGroup,
  buildLeadData,

  // Compatibility aliases
  syncGoogleSheetsToLeads,
  validateSheetLeadRows,
  insertSheetLeadRows,
  buildLeadData
};

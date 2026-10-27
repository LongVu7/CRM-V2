const { google } = require('googleapis');
const auth = require('../../../config/googleAuth');
const prisma = require('../../../config/db');
const { sheetInquirySyncSchema, sanitizeSheetMobile } = require('./inquirySchemas');
const {
  normalizeEnum,
  PROVINCE_MAP,
  CLASS_MAP,
  normalizeProvinceName,
  removeVietnameseTones
} = require('../../utils/enumMapper');
const { resolveHierarchy, normalizeHierarchyText } = require('../../utils/hierarchyUtils');

// !!-- PROVINCE GROUP CONFIGURATION -- !
// HO_CHI_MINH    → TP HCM khu vực (TP.HCM, Bình Dương, Vũng Tàu)
// CORE_PROVINCE  → Tỉnh ruột (Đồng Nai, Lâm Đồng, Khánh Hòa, ...)
// OTHER_PROVINCE → Tỉnh ngoài (any recognized domestic province not in Tier 1/2)
// FOREIGN        → Nước ngoài (unrecognized or international)

/**
 * Province-to-Group mapping. Each key is the normalized (no-diacritics, lowercase)
 * province name; value is the Province Group enum.
 *
 * To reassign a province, move its entry to a different group.
 * To add a new province, add it here with the desired group.
 */
const PROVINCE_GROUP_RULES = {
  // ── Tier 1: HO_CHI_MINH ──
  'thanh pho ho chi minh': 'HO_CHI_MINH',
  'binh duong':            'HO_CHI_MINH',
  'ba ria - vung tau':     'HO_CHI_MINH',

  // ── Tier 2: CORE_PROVINCE ──
  'dong nai':    'CORE_PROVINCE',
  'lam dong':    'CORE_PROVINCE',
  'khanh hoa':   'CORE_PROVINCE',
  'tien giang':  'CORE_PROVINCE',
  'long an':     'CORE_PROVINCE',
  'tay ninh':    'CORE_PROVINCE',
  'dak lak':     'CORE_PROVINCE',
  'ben tre':     'CORE_PROVINCE',
  'binh thuan':  'CORE_PROVINCE',
  'binh phuoc':  'CORE_PROVINCE'
};

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

// ═══════════════════════════════════════════════════════════════════════════════
// §3. GOOGLE SHEETS API LAYER
// ═══════════════════════════════════════════════════════════════════════════════

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
  const [oldProvinces, schools, newProvinces, countries, majorData, statusData, sourceData] =
    await Promise.all([
      prisma.oldProvince.findMany(),
      prisma.school.findMany(),
      prisma.newProvince.findMany(),
      prisma.country.findMany(),
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
    fallbackNewProvinceId: newProvinces.length > 0 ? newProvinces[0].id : null,
    fallbackCountryId: countries.length > 0 ? countries[0].id : null
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
    fullName:        pick('fullName', 'Full Name', 'Name', 'Họ và tên'),
    mobile:          pick('mobile', 'Mobile', 'Phone', 'Số điện thoại'),
    email:           pick('email', 'Email'),
    school:          trimVal(pick('school', 'School', 'Trường THPT')),
    primaryAddress:  trimVal(pick('Primary Address', 'primaryAddress')),
    location:        trimVal(pick('Old Province', 'oldProvince', 'Address Province', 'Tỉnh/thành', 'location')),
    course:          trimVal(pick('course', 'Course', 'Specific Major', 'specificMajor', 'Interested Major', 'interestedMajor')),
    sourceDetail:    trimVal(pick('sourceDetail', 'Source Detail', 'UTM-medium', 'UTM-campaign')),
    approachMethod:  trimVal(pick('approachMethod', 'Approach Method', 'UTM-name')),
    class:           trimVal(pick('class', 'Class', 'Lớp')),
    source:          trimVal(pick('source', 'Source') || sheetMetadata.source || 'Online'),
    schoolType:      row.schoolType || ''
  };
}

//  ROW VALIDATION & CLASSIFICATION

/**
 * Validates core identity fields (fullName, mobile, email) via Zod schema.
 * Populates `_meta.errors` and sets classification to INVALID on failure.
 */
function parseAndValidateRow(r, raw) {
  const syncParse = sheetInquirySyncSchema.safeParse({
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
 * Classifies row based on whether the student/inquiry already exists in DB.
 *
 * Results:
 *   READY_NEW_STUDENT_AND_INQUIRY       → student does not exist
 *   READY_EXISTING_STUDENT_NEW_INQUIRY  → student exists, no inquiry yet
 *   EXISTING_INQUIRY                    → student + inquiry both exist
 */
function classifyByExistingStudent(row, existingStudents) {
  const student = existingStudents.find(s => s.mobile === row.mobile);

  if (student) {
    row.existingStudentId = student.id;
    row.existingStudent = student;
    row._meta.classification = student.inquiry
      ? 'EXISTING_INQUIRY'
      : 'READY_EXISTING_STUDENT_NEW_INQUIRY';
  } else {
    row._meta.classification = 'READY_NEW_STUDENT_AND_INQUIRY';
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
  existingInquiry: 0, duplicateInFile: 0, mappingIssue: 0, invalid: 0
};

const CLASSIFICATION_KEYS = [
  ['readyNew',        'READY_NEW_STUDENT_AND_INQUIRY'],
  ['readyExisting',   'READY_EXISTING_STUDENT_NEW_INQUIRY'],
  ['existingInquiry', 'EXISTING_INQUIRY'],
  ['duplicateInFile', 'DUPLICATE_IN_FILE'],
  ['mappingIssue',    'MAPPING_ISSUE'],
  ['invalid',         'INVALID']
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
 * Validates and enriches inquiry rows for Google Sheets synchronization.
 *
 * Pipeline:
 *   1. Extract & validate raw fields (Zod schema)
 *   2. Detect intra-batch duplicate mobiles
 *   3. Classify by existing student/inquiry in DB
 *   4. Resolve geography (province → school)
 *   5. Resolve academics (major, class, school type)
 *   6. Resolve source hierarchy & default status
 *
 * @param {Object[]} rawData - Array of raw row objects from the sheet
 * @param {Object} sheetMetadata - Sheet-level metadata (source, sheetName)
 * @returns {{ summary: Object, rows: Object[] }}
 */
async function validateSheetInquiryRows(rawData, sheetMetadata = {}) {
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
    include: { inquiry: true }
  });

  // ── Step 3: Enrich each non-classified row ──
  for (const row of parsedRows) {
    if (row._meta.classification) continue; // Already INVALID or DUPLICATE_IN_FILE

    // 3a. Classify by existing student/inquiry
    classifyByExistingStudent(row, existingStudents);

    // 3b. Geography: Province Group + Old Province + School
    const matchedProv = resolveProvince(row, refData.oldProvinces);
    resolveSchool(row, matchedProv, refData.schools);

    row.primaryAddress = row.primaryAddress || null;
    row.newProvinceId = refData.fallbackNewProvinceId;
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

// ═══════════════════════════════════════════════════════════════════════════════
// §8. PERSISTENCE LAYER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolves fallback newProvinceId and countryId within a transaction.
 */
async function resolveDefaultGeoIds(tx, row) {
  let npId = row.newProvinceId;
  let cId = row.countryId;
  if (!npId || !cId) {
    const defaultNp = await tx.newProvince.findFirst();
    const defaultC = await tx.country.findFirst();
    npId = npId || defaultNp?.id;
    cId = cId || defaultC?.id;
  }
  return { npId, cId };
}

/**
 * Builds the StudentEducation data payload used for both create and reference.
 */
function buildEducationData(studentId, row, npId, cId) {
  return {
    studentId,
    schoolId: row.schoolId || null,
    newProvinceId: npId,
    countryId: cId,
    provinceGroup: row.provinceGroup || 'OTHER_PROVINCE',
    schoolType: row.resolvedSchoolType || 'NONE',
    class: row.resolvedClass || 'NONE'
  };
}

/**
 * Creates a SpecializedRegister record if major data is provided.
 * Returns the created record's ID, or null.
 */
async function createSpecializedRegisterIfNeeded(tx, row) {
  if (!row.interestedMajorId || !row.specificMajorId) return null;

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
  return sr.id;
}

/**
 * Builds the Inquiry data payload.
 */
function buildInquiryData(row, studentId) {
  return {
    assignedToId: null,
    description: null,
    dataReceived: new Date(),
    groupTele: null,
    priority: null,
    statusDataId: row.statusDataId || null,
    sourceDataId: row.sourceDataId || null,
    studentId
  };
}

/**
 * Upserts student information from Google Sheets.
 * Updates existing Student, StudentEducation, and SpecializedRegister.
 * Does not overwrite populated fields with empty/null/NONE values.
 *
 * @returns {boolean} true if any data was updated
 */
async function upsertStudentData(tx, studentId, row) {
  const student = await tx.student.findUnique({
    where: { id: studentId },
    include: { education: true, specializedRegister: true }
  });

  if (!student) return false;

  let wasUpdated = false;

  // 1. Student core fields (only overwrite if incoming value is non-empty)
  const studentUpdates = {};
  if (row.fullName && row.fullName !== student.fullName) {
    studentUpdates.fullName = row.fullName;
  }
  if (row.email && row.email !== student.email) {
    studentUpdates.email = row.email;
  }
  if (row.primaryAddress && row.primaryAddress !== student.primaryAddress) {
    studentUpdates.primaryAddress = row.primaryAddress;
  }

  // 2. SpecializedRegister (Majors)
  if (row.interestedMajorId && row.specificMajorId) {
    if (student.specializedRegisterId) {
      const currentSr = student.specializedRegister;
      if (
        !currentSr ||
        currentSr.interestedMajorId !== row.interestedMajorId ||
        currentSr.specificMajorId !== row.specificMajorId
      ) {
        await tx.specializedRegister.update({
          where: { id: student.specializedRegisterId },
          data: {
            interestedMajorId: row.interestedMajorId,
            specificMajorId: row.specificMajorId
          }
        });
        wasUpdated = true;
      }
    } else {
      const srId = await createSpecializedRegisterIfNeeded(tx, row);
      if (srId) studentUpdates.specializedRegisterId = srId;
    }
  }

  if (Object.keys(studentUpdates).length > 0) {
    await tx.student.update({
      where: { id: student.id },
      data: studentUpdates
    });
    wasUpdated = true;
  }

  // 3. StudentEducation
  if (student.education) {
    const eduUpdates = {};

    if (row.schoolId && row.schoolId !== student.education.schoolId) {
      eduUpdates.schoolId = row.schoolId;
    }

    if (row.resolvedClass && row.resolvedClass !== 'NONE' && row.resolvedClass !== student.education.class) {
      eduUpdates.class = row.resolvedClass;
    }

    if (row.resolvedSchoolType && row.resolvedSchoolType !== 'NONE' && row.resolvedSchoolType !== student.education.schoolType) {
      eduUpdates.schoolType = row.resolvedSchoolType;
    }

    if (row.provinceGroup && row.provinceGroup !== 'FOREIGN' && row.provinceGroup !== student.education.provinceGroup) {
      eduUpdates.provinceGroup = row.provinceGroup;
    }

    if (Object.keys(eduUpdates).length > 0) {
      await tx.studentEducation.update({
        where: { id: student.education.id },
        data: eduUpdates
      });
      wasUpdated = true;
    }
  } else {
    const { npId, cId } = await resolveDefaultGeoIds(tx, row);

    await tx.studentEducation.create({
      data: buildEducationData(student.id, row, npId, cId)
    });
    wasUpdated = true;
  }

  return wasUpdated;
}

// ─── Row-level transaction handlers ───────────────────────────────────────────

/**
 * Creates a new Student + StudentEducation + Inquiry (and optional SpecializedRegister).
 */
async function handleNewStudentAndInquiry(tx, row) {
  const srId = await createSpecializedRegisterIfNeeded(tx, row);

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

  const { npId, cId } = await resolveDefaultGeoIds(tx, row);

  await tx.studentEducation.create({
    data: buildEducationData(student.id, row, npId, cId)
  });

  await tx.inquiry.create({
    data: buildInquiryData(row, student.id)
  });
}

/**
 * Creates a new Inquiry for an existing student and upserts their data.
 */
async function handleExistingStudentNewInquiry(tx, row) {
  await tx.inquiry.create({
    data: buildInquiryData(row, row.existingStudentId)
  });

  await upsertStudentData(tx, row.existingStudentId, row);
}

/**
 * Persists validated Google Sheets rows using atomic per-row transactions.
 * Each row is processed independently — failures are logged and skipped.
 */
async function insertSheetInquiryRows(rows, context = { type: 'SYSTEM', name: 'Google Sheets Background Sync' }) {
  const counters = {
    newStudentsCreated: 0,
    newInquiriesForExisting: 0,
    existingStudentsUpdated: 0,
    skipped: 0
  };

  /** Maps classification → { handler, counterKey } */
  const HANDLERS = {
    'READY_NEW_STUDENT_AND_INQUIRY': {
      handler: handleNewStudentAndInquiry,
      counterKey: 'newStudentsCreated'
    },
    'READY_EXISTING_STUDENT_NEW_INQUIRY': {
      handler: handleExistingStudentNewInquiry,
      counterKey: 'newInquiriesForExisting'
    }
  };

  for (const row of rows) {
    const config = HANDLERS[row._meta.classification];

    if (config) {
      // Classifications with dedicated transaction handlers
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
    } else if (row._meta.classification === 'EXISTING_INQUIRY') {
      // Inquiry already exists: only upsert student data (Insert-Only for Inquiry)
      try {
        let wasUpdated = false;
        await prisma.$transaction(async (tx) => {
          wasUpdated = await upsertStudentData(tx, row.existingStudentId, row);
        });

        if (wasUpdated) {
          counters.existingStudentsUpdated++;
        } else {
          counters.skipped++;
        }
      } catch (err) {
        logSync('ERROR', `Upsert transaction failed for existing student sheet row ${row._meta.rowNumber}`, {
          rowNumber: row._meta.rowNumber,
          mobile: row.mobile,
          error: err.message || err
        });
        counters.skipped++;
      }
    } else {
      // INVALID, DUPLICATE_IN_FILE, MAPPING_ISSUE, etc.
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
  const { summary, rows: previewRows } = await validateSheetInquiryRows(
    remappedRows,
    { source: sheet.source, sheetName: sheet.name }
  );

  logSync('INFO', 'Validation classification breakdown', {
    sheet: sheet.name,
    totalRows: summary.total,
    readyNew: summary.readyNew,
    readyExisting: summary.readyExisting,
    existingInquiry: summary.existingInquiry,
    duplicateInFile: summary.duplicateInFile,
    mappingIssue: summary.mappingIssue,
    invalid: summary.invalid
  });

  logProblemRows(sheet.name, previewRows);

  // 4. Persist valid rows
  const result = await insertSheetInquiryRows(previewRows, {
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

/**
 * Main entry point: syncs all configured Google Sheets to CRM Inquiries.
 * Processes each sheet independently — one sheet's failure doesn't block others.
 */
async function syncGoogleSheetsToInquiries() {
  const results = [];

  for (const sheetConfig of SHEETS_REGISTRY) {
    const sheetId = process.env[sheetConfig.envVar];

    if (!sheetId) {
      logSync('ERROR', 'Missing environment variable for sheet ID', {
        sheet: sheetConfig.name,
        error: `Missing env var: ${sheetConfig.envVar}`
      });
      results.push({
        sheet: sheetConfig.name,
        status: 'SKIPPED',
        error: 'Missing environment variable for sheet ID'
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
}

module.exports = {
  HEADER_MAP_WEB_HCM,
  HEADER_MAP_MULTIPLE_CHOICE,
  fetchSheetRows,
  remapHeaders,
  validateSheetInquiryRows,
  insertSheetInquiryRows,
  upsertStudentData,
  syncGoogleSheetsToInquiries,
  resolveProvinceGroup
};

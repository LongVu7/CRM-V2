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
const { applyStatusTransition } = require('../../utils/statusTransition');

// ─── Sheet Configuration Registry ───────────────────────────────────────────
const SHEETS_REGISTRY = [
  {
    envVar: 'GOOGLE_SHEET_ID_WEB_HCM',
    name: 'WEB_HCM',
    headerMap: {
      'Name': 'Full Name',
      'Phone': 'Mobile',
      'Email': 'Email',
      'School': 'School',
      'Address': 'Primary Address',
      'Course': 'Specific Major',
      'UTM-medium': 'Source Detail',
      'UTM-name': 'Approach Method',
      'Address Province': 'Old Province'
    },
    source: 'Online'
  },
  {
    envVar: 'GOOGLE_SHEET_ID_MULTIPLE_CHOICE',
    name: 'MULTIPLE_CHOICE',
    headerMap: {
      'Họ và tên': 'Full Name',
      'Số điện thoại': 'Mobile',
      'Email': 'Email',
      'Trường THPT': 'School',
      'Tỉnh/thành': 'Old Province',
      'UTM-campaign': 'Source Detail',
      'UTM-medium': 'Approach Method',
      'Lớp': 'Class'
    },
    source: 'Offline'
  }
];

// ─── Resolution Helpers ─────────────────────────────────────────────────────
const resolveProvinceGroup = (provinceInput, oldProvinces = []) => {
  if (!provinceInput) return 'FOREIGN';
  const enumNorm = normalizeEnum(provinceInput);
  if (PROVINCE_MAP[enumNorm]) return PROVINCE_MAP[enumNorm];

  const normalized = normalizeProvinceName(provinceInput);
  if (!normalized) return 'FOREIGN';
  if (PROVINCE_GROUP_RULES[normalized]) return PROVINCE_GROUP_RULES[normalized];

  if (Array.isArray(oldProvinces) && oldProvinces.length > 0) {
    const rawLower = String(provinceInput).toLowerCase().trim();
    const matched = oldProvinces.some(op => {
      const opName = typeof op === 'string' ? op : (op.name || '');
      return normalizeProvinceName(opName) === normalized || opName.toLowerCase() === rawLower;
    });
    return matched ? 'OTHER_PROVINCE' : 'FOREIGN';
  }

  return 'OTHER_PROVINCE';
};

const cleanSchool = (s) => removeVietnameseTones(String(s))
  .toLowerCase()
  .replace(/^(truong\s+thpt|thpt|truong\s+ptth|ptth|truong)\s+/i, '')
  .replace(/[\.\-_]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const normalizeMajorText = (txt) => {
  if (!txt) return '';
  return removeVietnameseTones(String(txt))
    .toLowerCase()
    .replace(/y/g, 'i')
    .replace(/[\s\-_]+/g, ' ')
    .trim();
};

function buildLeadDescription(row) {
  const notes = [];
  if (row.school && !row.schoolId) notes.push(`Missing School: ${row.school}`);
  if (row.location && !row.oldProvinceId) notes.push(`Missing Old Province: ${row.location}`);
  return notes.length > 0 ? notes.join(' | ') : null;
}

// ─── Google Sheets API ──────────────────────────────────────────────────────
async function fetchSheetRows(sheetId, authClient) {
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const sheetName = sheetInfo.data.sheets[0].properties.title;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: sheetName
  });

  const values = response.data.values;
  if (!values || values.length === 0) return [];

  const headers = values[0];
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const rowArray = values[i];
    if (!rowArray || rowArray.every(val => !val || String(val).trim() === '')) continue;

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

function remapHeaders(rows, headerMap, injectedFields = {}) {
  return rows.map(row => {
    const newRow = {};
    for (const [originalKey, value] of Object.entries(row)) {
      newRow[headerMap[originalKey] || originalKey] = value;
    }
    for (const [key, value] of Object.entries(injectedFields)) {
      newRow[key] = value;
    }
    return newRow;
  });
}

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

// ─── Reference Data Preloading ──────────────────────────────────────────────
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

// ─── Validation & Orchestration ─────────────────────────────────────────────
const CLASSIFICATION_KEYS = [
  ['ready', 'READY'],
  ['existingLead', 'EXISTING_LEAD'],
  ['duplicateInFile', 'DUPLICATE_IN_FILE'],
  ['mappingIssue', 'MAPPING_ISSUE'],
  ['invalid', 'INVALID']
];

function buildSummary(parsedRows) {
  const summary = { total: parsedRows.length };
  for (const [key, value] of CLASSIFICATION_KEYS) {
    summary[key] = parsedRows.filter(r => r._meta.classification === value).length;
  }
  summary.readyNew = summary.ready;
  return summary;
}

async function validateSheetLeadRows(rawData, sheetMetadata = {}) {
  if (!rawData || rawData.length === 0) {
    return {
      summary: { total: 0, ready: 0, readyNew: 0, existingLead: 0, duplicateInFile: 0, mappingIssue: 0, invalid: 0 },
      rows: []
    };
  }

  const refData = await fetchReferenceData();

  // 1. Build O(1) Lookup Maps for Master Data
  const oldProvinceMap = new Map();
  for (const p of refData.oldProvinces) {
    oldProvinceMap.set(p.name.trim().toLowerCase(), p);
    oldProvinceMap.set(normalizeProvinceName(p.name), p);
  }

  const schoolMap = new Map();
  for (const s of refData.schools) {
    schoolMap.set(`${s.oldProvinceId}_${s.name.trim().toLowerCase()}`, s.id);
    schoolMap.set(`${s.oldProvinceId}_${cleanSchool(s.name)}`, s.id);
  }

  const majorMap = new Map();
  for (const m of refData.majorData) {
    if (m.label) majorMap.set(normalizeMajorText(m.label), m);
    if (m.name) majorMap.set(normalizeMajorText(m.name), m);
  }

  // 2. Extract & validate raw rows
  const mobileMap = new Map();
  const parsedRows = rawData.map((row, index) => {
    const raw = extractRawFields(row, sheetMetadata);
    const r = {
      _meta: { rowNumber: index + 2, errors: [], warnings: [], raw: row, classification: null },
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
      r.fullName = syncParse.data.fullName;
      r.mobile = syncParse.data.mobile;
      r.email = syncParse.data.email || null;
    }

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

  // 3. Query existing leads by mobile 
  const distinctMobiles = [...new Set(parsedRows.map(r => r.mobile).filter(Boolean))];
  const existingLeads = await prisma.student.findMany({
    where: { mobile: { in: distinctMobiles } },
    select: { mobile: true }
  });
  const existingMobiles = new Set(existingLeads.map(s => s.mobile));

  // 4. Enrich and classify rows
  for (const row of parsedRows) {
    if (row._meta.classification) continue;

    if (existingMobiles.has(row.mobile)) {
      row._meta.classification = 'EXISTING_LEAD';
      continue;
    }

    row._meta.classification = 'READY';

    // Geography resolution O(1)
    const rawLoc = row.location || '';
    const rawLocLower = rawLoc.trim().toLowerCase();
    const locNorm = normalizeProvinceName(rawLoc);
    const matchedProv = oldProvinceMap.get(rawLocLower) || oldProvinceMap.get(locNorm) || null;

    row.provinceGroup = resolveProvinceGroup(rawLoc, refData.oldProvinces);
    if (matchedProv) {
      row.oldProvinceId = matchedProv.id;
      if (row.school) {
        const schNorm = cleanSchool(row.school);
        const schId = schoolMap.get(`${matchedProv.id}_${String(row.school).trim().toLowerCase()}`)
                   || schoolMap.get(`${matchedProv.id}_${schNorm}`);
        if (schId) row.schoolId = schId;
      }
    } else if (rawLoc) {
      row.provinceGroup = 'FOREIGN';
    }

    row.primaryAddress = row.primaryAddress || null;
    row.newProvinceId = null;
    row.countryId = refData.fallbackCountryId;

    // Academic resolution O(1)
    if (row.course) {
      const matchedMajor = majorMap.get(normalizeMajorText(row.course));
      if (matchedMajor) {
        if (matchedMajor.parentId) {
          row.interestedMajorId = matchedMajor.parentId;
          row.specificMajorId = matchedMajor.id;
        } else {
          row.interestedMajorId = matchedMajor.id;
          const firstChild = refData.majorData.find(m => m.parentId === matchedMajor.id);
          if (firstChild) row.specificMajorId = firstChild.id;
        }
      }
    }

    // Class & SchoolType enums
    if (row.class) {
      const normClass = normalizeEnum(row.class);
      const VALID_CLASS = ['GRADE_11', 'GRADE_12', 'FREELANCE', 'NONE'];
      row.resolvedClass = CLASS_MAP[normClass]
        || (normClass === '12' ? 'GRADE_12'
          : (normClass === '11' ? 'GRADE_11'
            : (VALID_CLASS.includes(normClass) ? normClass : 'NONE')));
    } else {
      row.resolvedClass = 'NONE';
    }

    if (row.schoolType) {
      let normST = normalizeEnum(row.schoolType);
      if (normST === 'A_') normST = 'A_STAR';
      const VALID_ST = ['A_STAR', 'A', 'B', 'C', 'D', 'NONE'];
      row.resolvedSchoolType = VALID_ST.includes(normST) ? normST : 'NONE';
    } else {
      row.resolvedSchoolType = 'NONE';
    }

    // Default status & source hierarchy
    if (refData.defaultInitialStatus) {
      row.statusDataId = refData.defaultInitialStatus.id;
    }

    const targetSource = row.source || 'Online';
    const rootSrc = refData.sourceData.find(
      s => !s.parentId && normalizeHierarchyText(s.label) === normalizeHierarchyText(targetSource)
    );

    if (row.sourceDetail || row.approachMethod) {
      const srcRes = resolveHierarchy(
        refData.sourceData,
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

  return { summary: buildSummary(parsedRows), rows: parsedRows };
}

// ─── Database Mutation (Insert-Only with Milestone Stamping) ────────────────
async function insertSheetLeadRows(rows, context = { type: 'SYSTEM', name: 'Google Sheets Background Sync' }) {
  const counters = {
    importedCount: 0,
    skipped: 0,
    get newStudentsCreated() { return this.importedCount; },
    get newLeadsForExisting() { return 0; },
    get existingStudentsUpdated() { return 0; }
  };

  for (const row of rows) {
    const classification = row._meta?.classification;

    if (classification === 'READY' || classification === 'READY_NEW_LEAD') {
      try {
        await prisma.$transaction(async (tx) => {
          const milestoneUpdates = row.statusDataId
            ? await applyStatusTransition({ tx, lead: {}, newStatusDataId: row.statusDataId })
            : {};

          const hasAcademic = Boolean(row.interestedMajorId && row.specificMajorId);

          const lead = await tx.lead.create({
            data: {
              description: buildLeadDescription(row),
              dataReceived: new Date(),
              ...(row.statusDataId && { statusData: { connect: { id: row.statusDataId } } }),
              ...(row.sourceDataId && { sourceData: { connect: { id: row.sourceDataId } } }),
              ...milestoneUpdates,
              student: {
                create: {
                  fullName: row.fullName,
                  gender: 'Unknown',
                  email: row.email || null,
                  mobile: row.mobile,
                  primaryAddress: row.primaryAddress || null,
                  ...(hasAcademic && {
                    specializedRegister: {
                      create: {
                        interestedMajor: { connect: { id: row.interestedMajorId } },
                        specificMajor: { connect: { id: row.specificMajorId } },
                        gpa: 'OTHER',
                        programScore: 'OTHER'
                      }
                    }
                  }),
                  education: {
                    create: {
                      country: { connect: { id: row.countryId } },
                      ...(row.schoolId && { school: { connect: { id: row.schoolId } } }),
                      ...(row.oldProvinceId && { oldProvince: { connect: { id: row.oldProvinceId } } }),
                      provinceGroup: row.provinceGroup || 'OTHER_PROVINCE',
                      schoolType: row.resolvedSchoolType || 'NONE',
                      class: row.resolvedClass || 'NONE'
                    }
                  }
                }
              }
            }
          });

          if (row.statusDataId) {
            await tx.leadStatusHistory.create({
              data: {
                leadId: lead.id,
                previousStatusId: null,
                newStatusId: row.statusDataId,
                notes: 'Initial Google Sheets sync status',
                changedAt: new Date()
              }
            });
          }
        });
        counters.importedCount++;
      } catch (err) {
        logSync('ERROR', `Transaction failed for sheet sync row ${row._meta.rowNumber}`, {
          rowNumber: row._meta.rowNumber,
          mobile: row.mobile,
          error: err.message || err
        });
        counters.skipped++;
      }
    } else {
      counters.skipped++;
    }
  }

  return counters;
}

// ─── Sync Orchestrator ──────────────────────────────────────────────────────
function logSync(severity, message, extra = {}) {
  const logFn = severity === 'ERROR' ? console.error : console.log;
  logFn(JSON.stringify({
    severity,
    message,
    ...extra,
    timestamp: new Date().toISOString()
  }));
}

function logProblemRows(sheetName, previewRows) {
  for (const classification of ['MAPPING_ISSUE', 'INVALID']) {
    const problemRows = previewRows.filter(r => r._meta.classification === classification);
    if (problemRows.length > 0) {
      logSync('WARNING', `${classification} details`, {
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

async function processSingleSheet(sheet) {
  const rawRows = await fetchSheetRows(sheet.id, auth);
  logSync('INFO', 'Google Sheet fetched', { sheet: sheet.name, totalRawRows: rawRows.length });

  const remappedRows = remapHeaders(rawRows, sheet.headerMap, { Source: sheet.source });
  const { summary, rows: previewRows } = await validateSheetLeadRows(
    remappedRows,
    { source: sheet.source, sheetName: sheet.name }
  );

  logSync('INFO', 'Validation classification breakdown', {
    sheet: sheet.name,
    ...summary
  });

  logProblemRows(sheet.name, previewRows);

  const result = await insertSheetLeadRows(previewRows, {
    type: 'SYSTEM',
    name: `Google Sheets Background Sync: ${sheet.name}`
  });

  logSync('INFO', 'Sync completed', { sheet: sheet.name, ...result });
  console.log(`─── [Done Sheet: ${sheet.name}] ────────────────────────────────────\n`);

  return {
    sheet: sheet.name,
    status: 'SUCCESS',
    totalRawRows: rawRows.length,
    ...result
  };
}

// shortcut: in-memory lock is only safe for single-process instances, upgrade to Redis/DB advisory lock if scaling across clustered containers
let isSyncInProgress = false;

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

    if (results.some(r => r.status === 'SUCCESS')) {
      console.log('═══════════════════════════════════════════════════════════════════\n');
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
  resolveProvinceGroup
};

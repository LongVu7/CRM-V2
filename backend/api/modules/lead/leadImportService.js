const xlsx = require('xlsx');
const {
  ProvinceGroup,
  SchoolType,
  StudentClass,
  Priority,
  EnglishCertificate,
  GPA,
  ProgramScore
} = require('@prisma/client');
const prisma = require('../../../config/db');
const crypto = require('crypto');
const {
  normalizeEnum,
  normalizeProvinceName,
  PROVINCE_MAP,
  CLASS_MAP,
  GPA_MAP,
  PROGRAM_SCORE_MAP,
  ENGLISH_CERT_MAP
} = require('../../utils/enumMapper');
const { applyStatusTransition } = require('../../utils/statusTransition');
const { resolveHierarchy } = require('../../utils/taxonomyHierarchy');
const importTokens = require('../../utils/importTokenStore');

// ─── Column Configuration ──────────────────────────────────────────
// requiredStruct: Must be present in the uploaded spreadsheet header row
// requiredNew: Mandatory value when creating a new Student record
const COLUMN_MAP = {
  'Full Name': { key: 'fullName', requiredStruct: true, requiredNew: true },
  'Gender': { key: 'gender', requiredStruct: false, requiredNew: false },
  'Email': { key: 'email', requiredStruct: true, requiredNew: false },
  'Mobile': { key: 'mobile', requiredStruct: true, requiredNew: true },
  'Other Phone': { key: 'otherPhone', requiredStruct: false, requiredNew: false },
  'Birth Date': { key: 'birthDate', requiredStruct: false, requiredNew: false },
  'Primary Address': { key: 'primaryAddress', requiredStruct: false, requiredNew: false },
  'Priority': { key: 'priority', requiredStruct: false, requiredNew: false },

  'Old Province': { key: 'oldProvince', requiredStruct: false, requiredNew: false },
  'School': { key: 'school', requiredStruct: false, requiredNew: false },
  'New Province': { key: 'newProvince', requiredStruct: false, requiredNew: false },
  'Country': { key: 'country', requiredStruct: false, requiredNew: false },
  'Province Group': { key: 'provinceGroup', requiredStruct: false, requiredNew: false },
  'School Type': { key: 'schoolType', requiredStruct: false, requiredNew: false },
  'Class': { key: 'class', requiredStruct: false, requiredNew: false },

  'Interested Major': { key: 'interestedMajor', requiredStruct: false, requiredNew: false },
  'Specific Major': { key: 'specificMajor', requiredStruct: false, requiredNew: false },
  'Admission Year': { key: 'admissionYear', requiredStruct: false, requiredNew: false },
  'English Certificate': { key: 'englishCertificate', requiredStruct: false, requiredNew: false },
  'GPA': { key: 'gpa', requiredStruct: false, requiredNew: false },
  'Program Score': { key: 'programScore', requiredStruct: false, requiredNew: false },

  'Assigned To': { key: 'assignedTo', requiredStruct: false, requiredNew: false },
  'Status Interaction': { key: 'statusInteraction', requiredStruct: false, requiredNew: false },
  'Status General': { key: 'statusGeneral', requiredStruct: false, requiredNew: false },
  'Status Detail': { key: 'statusDetail', requiredStruct: false, requiredNew: false },
  'Source': { key: 'source', requiredStruct: false, requiredNew: false },
  'Source Detail': { key: 'sourceDetail', requiredStruct: false, requiredNew: false },
  'Approach Method': { key: 'approachMethod', requiredStruct: false, requiredNew: false },
  'Description': { key: 'description', requiredStruct: false, requiredNew: false },
  'Data Received': { key: 'dataReceived', requiredStruct: false, requiredNew: false },
};

const generateTemplate = () => {
  const headers = Object.keys(COLUMN_MAP);
  const worksheet = xlsx.utils.aoa_to_sheet([headers]);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Import Template');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

// ─── Normalization & Extraction Helpers ─────────────────────────────
const normalizeMobile = (val) => {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;
  let cleaned = str.replace(/\D/g, '');
  if (cleaned.length === 9 && !cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
};

const parseExcelDate = (val) => {
  if (!val) return null;
  if (typeof val === 'number') {
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

/**
 *  Case-insensitive column extractor 
 * Tolerates whitespace, case variations, or direct camelCase key names.
 */
const getFieldValue = (row, header, configKey) => {
  if (row[header] !== undefined) return row[header];
  if (configKey && row[configKey] !== undefined) return row[configKey];
  const target = header.toLowerCase().replace(/[\s_]/g, '');
  const key = Object.keys(row).find(k => k.toLowerCase().replace(/[\s_]/g, '') === target);
  return key ? row[key] : undefined;
};

const validateRequiredHeaders = (rawData) => {
  if (rawData.length === 0) {
    const error = new Error('The uploaded file is empty');
    error.status = 400;
    throw error;
  }

  const fileHeaders = Object.keys(rawData[0] || {});
  const normalizedFileHeaders = new Set(fileHeaders.map(h => h.trim().toLowerCase().replace(/[\s_]/g, '')));

  for (const [header, config] of Object.entries(COLUMN_MAP)) {
    if (config.requiredStruct) {
      const headerTarget = header.toLowerCase().replace(/[\s_]/g, '');
      const keyTarget = config.key.toLowerCase().replace(/[\s_]/g, '');
      const isPresent = fileHeaders.includes(header) ||
        normalizedFileHeaders.has(headerTarget) ||
        normalizedFileHeaders.has(keyTarget);
      if (!isPresent) {
        const error = new Error(`COLUMN_MISSING: Missing required header "${header}"`);
        error.status = 400;
        throw error;
      }
    }
  }
};

// ─── Validation Helpers ─────────────────────────────────────────────
const resolveEnumField = (row, field, { enumType, map = {}, fallback = null, errorLabel, preTransform }) => {
  const rawVal = row[field];
  if (!rawVal) {
    row[field] = fallback;
    return;
  }

  let norm = normalizeEnum(rawVal);
  if (preTransform) norm = preTransform(norm);
  const mapped = map[norm] || norm;

  if (Object.keys(enumType).includes(mapped)) {
    row[field] = mapped;
  } else {
    row[field] = mapped;
    row._meta.errors.push(`Invalid ${errorLabel}: ${mapped}`);
  }
};

const resolveStudentEnums = (row) => {
  resolveEnumField(row, 'provinceGroup', {
    enumType: ProvinceGroup,
    map: PROVINCE_MAP,
    fallback: 'OTHER_PROVINCE',
    errorLabel: 'Province Group'
  });
  resolveEnumField(row, 'schoolType', {
    enumType: SchoolType,
    fallback: 'NONE',
    errorLabel: 'School Type',
    preTransform: (v) => (v === 'A_' ? 'A_STAR' : v)
  });
  resolveEnumField(row, 'class', {
    enumType: StudentClass,
    map: CLASS_MAP,
    fallback: 'NONE',
    errorLabel: 'Class'
  });
  resolveEnumField(row, 'priority', {
    enumType: Priority,
    fallback: null,
    errorLabel: 'Priority'
  });
  resolveEnumField(row, 'gpa', {
    enumType: GPA,
    map: GPA_MAP,
    fallback: 'OTHER',
    errorLabel: 'GPA'
  });
  resolveEnumField(row, 'programScore', {
    enumType: ProgramScore,
    map: PROGRAM_SCORE_MAP,
    fallback: 'OTHER',
    errorLabel: 'Program Score'
  });
  resolveEnumField(row, 'englishCertificate', {
    enumType: EnglishCertificate,
    map: ENGLISH_CERT_MAP,
    fallback: null,
    errorLabel: 'English Certificate'
  });
};

// !--- Help function to find province with alias ---!
const findProvinceWithAlias = (provinceList, rawInput) => {
  if (!rawInput) return null;
  const rawTrimmedLower = String(rawInput).trim().toLowerCase();
  const normalizedInput = normalizeProvinceName(rawInput);

  return provinceList.find(p => {
    if (p.name.toLowerCase() === rawTrimmedLower) return true;
    return normalizeProvinceName(p.name) === normalizedInput;
  });
};

const resolveLocationAndSchool = (row, { oldProvinces, schools, newProvinces, countries }) => {
  if (row.oldProvince) {
    const op = findProvinceWithAlias(oldProvinces, row.oldProvince);
    if (!op) {
      row._meta.errors.push(`UNRESOLVED_MAPPING: Old Province "${row.oldProvince}"`);
    } else {
      row.oldProvinceId = op.id;
      if (row.school) {
        const sch = schools.find(s => s.name.toLowerCase() === row.school.toLowerCase() && s.oldProvinceId === op.id);
        if (!sch) {
          row._meta.errors.push(`UNRESOLVED_MAPPING: School "${row.school}" not found in province`);
        } else {
          row.schoolId = sch.id;
        }
      }
    }
  }

  if (row.newProvince) {
    const np = findProvinceWithAlias(newProvinces, row.newProvince);
    if (!np) row._meta.errors.push(`UNRESOLVED_MAPPING: New Province "${row.newProvince}"`);
    else row.newProvinceId = np.id;
  } else if (newProvinces.length > 0) {
    row.newProvinceId = newProvinces[0].id;
  }

  if (row.country) {
    const c = countries.find(x => x.name.toLowerCase() === row.country.toLowerCase());
    if (!c) row._meta.errors.push(`UNRESOLVED_MAPPING: Country "${row.country}"`);
    else row.countryId = c.id;
  } else if (countries.length > 0) {
    row.countryId = countries[0].id;
  }
};

const resolveCommonLeadFields = (row, { accounts, statusData, sourceData }) => {
  if (row.assignedTo) {
    const acc = accounts.find(a => a.email.toLowerCase() === row.assignedTo.toLowerCase());
    if (!acc) row._meta.errors.push(`UNRESOLVED_MAPPING: Assigned account Email "${row.assignedTo} is invalid"`);
    else row.assignedToId = acc.id;
  }

  if (row.statusInteraction || row.statusGeneral || row.statusDetail) {
    const statRes = resolveHierarchy(statusData, ['interaction', 'general', 'detail'], [row.statusInteraction, row.statusGeneral, row.statusDetail]);
    if (statRes.error) row._meta.errors.push(`INVALID_RELATION (Status): ${statRes.error}`);
    else row.statusDataId = statRes.resolvedId;
  }

  if (row.source || row.sourceDetail || row.approachMethod) {
    const srcRes = resolveHierarchy(sourceData, ['source', 'sourceDetail', 'approachMethod'], [row.source, row.sourceDetail, row.approachMethod]);
    if (srcRes.error) row._meta.errors.push(`INVALID_RELATION (Source): ${srcRes.error}`);
    else row.sourceDataId = srcRes.resolvedId;
  }
};

const resolveMajorAndAcademicIntentions = (row, majorData) => {
  if (row.interestedMajor || row.specificMajor) {
    const majorRes = resolveHierarchy(majorData, ['interestedMajor', 'specificMajor'], [row.interestedMajor, row.specificMajor]);
    if (majorRes.error) {
      row._meta.errors.push(`INVALID_RELATION (Major): ${majorRes.error}`);
    } else {
      row.interestedMajorId = majorRes.resolvedIds && majorRes.resolvedIds[0];
      row.specificMajorId = majorRes.resolvedIds && majorRes.resolvedIds[1];
    }
  }

  const hasAcademicIntentions = row.interestedMajorId || row.admissionYear || row.englishCertificate || row.gpa || row.programScore;
  if (hasAcademicIntentions && !row.interestedMajorId) {
    row._meta.errors.push('Interested Major is required when Academic Intentions are provided');
  }
};

const classifyRow = (row, isNew, student) => {
  if (row._meta.errors.length > 0) {
    const hasUnresolved = row._meta.errors.some(e => e.includes('UNRESOLVED_MAPPING') || e.includes('INVALID_RELATION'));
    row._meta.classification = hasUnresolved ? 'MAPPING_ISSUE' : 'INVALID';
  } else {
    row._meta.classification = isNew ? 'READY_NEW_STUDENT_AND_LEAD' : 'READY_EXISTING_STUDENT_NEW_LEAD';
    if (!isNew && student) {
      row.existingStudentId = student.id;
    }
  }
};

const buildSummary = (rows) => ({
  total: rows.length,
  readyNew: rows.filter(r => r._meta.classification === 'READY_NEW_STUDENT_AND_LEAD').length,
  readyExisting: rows.filter(r => r._meta.classification === 'READY_EXISTING_STUDENT_NEW_LEAD').length,
  existingLead: rows.filter(r => r._meta.classification === 'EXISTING_LEAD').length,
  duplicateInFile: rows.filter(r => r._meta.classification === 'DUPLICATE_IN_FILE').length,
  mappingIssue: rows.filter(r => r._meta.classification === 'MAPPING_ISSUE').length,
  invalid: rows.filter(r => r._meta.classification === 'INVALID').length,
});

// !------ Import process -------!
// Validate headers and structure
const validateLeadRows = async (rawData) => {
  validateRequiredHeaders(rawData);

  // 1. Parse and normalize row data
  const parsedRows = rawData.map((row, index) => {
    const r = { _meta: { rowNumber: index + 2, errors: [], warnings: [], raw: row } };
    for (const [header, config] of Object.entries(COLUMN_MAP)) {
      const val = getFieldValue(row, header, config.key);
      r[config.key] = typeof val === 'string' ? val.trim() : val;
    }
    r.mobile = normalizeMobile(r.mobile);
    r.birthDate = parseExcelDate(r.birthDate);
    r.dataReceived = parseExcelDate(r.dataReceived);
    return r;
  });

  // 2. Check duplicate mobile in file
  const mobileMap = new Map();
  for (const row of parsedRows) {
    if (row.mobile) {
      if (mobileMap.has(row.mobile)) {
        row._meta.classification = 'DUPLICATE_IN_FILE';
        row._meta.errors.push(`Mobile ${row.mobile} is duplicated in row ${mobileMap.get(row.mobile)}`);
      } else {
        mobileMap.set(row.mobile, row._meta.rowNumber);
      }
    } else {
      row._meta.errors.push('Mobile is required for every row');
      row._meta.classification = 'INVALID';
    }
  }

  // 3. Batch preload reference data concurrently to check duplicate mobile in database
  const mobiles = [...new Set(parsedRows.map(r => r.mobile).filter(Boolean))];
  const [
    existingStudents,
    oldProvinces,
    schools,
    newProvinces,
    countries,
    majorData,
    statusData,
    sourceData,
    accounts
  ] = await Promise.all([
    prisma.student.findMany({ where: { mobile: { in: mobiles } }, include: { lead: true } }),
    prisma.oldProvince.findMany(),
    prisma.school.findMany(),
    prisma.newProvince.findMany(),
    prisma.country.findMany(),
    prisma.majorData.findMany({ where: { isActive: true } }),
    prisma.statusData.findMany({ where: { isActive: true } }),
    prisma.sourceData.findMany({ where: { isActive: true } }),
    prisma.account.findMany({ where: { isActive: true } })
  ]);

  const refData = { oldProvinces, schools, newProvinces, countries, accounts, statusData, sourceData };

  // 4. Validate and classify each row
  for (const row of parsedRows) {
    if (row._meta.classification) continue;

    const student = existingStudents.find(s => s.mobile === row.mobile);
    const isNew = !student;

    if (!isNew && student.lead) {
      row._meta.classification = 'EXISTING_LEAD';
      continue;
    }

    if (isNew) {
      for (const [header, config] of Object.entries(COLUMN_MAP)) {
        if (config.requiredNew && (row[config.key] === null || row[config.key] === '' || row[config.key] === undefined)) {
          row._meta.errors.push(`MISSING_REQUIRED_FIELD: ${header} is required for new students`);
        }
      }

      resolveLocationAndSchool(row, refData);
      resolveStudentEnums(row);
      resolveMajorAndAcademicIntentions(row, majorData);
    } else {
      row._meta.warnings.push('Uploaded Student, Education, and Specialized Register data will be ignored as the student already exists.');
    }

    resolveCommonLeadFields(row, refData);
    classifyRow(row, isNew, student);
  }

  return { summary: buildSummary(parsedRows), rows: parsedRows };
};

const previewImportLead = async (parsedData, accountId) => {
  const { summary, rows: parsedRows } = await validateLeadRows(parsedData);

  const importToken = crypto.randomUUID();
  importTokens.set(importToken, {
    accountId,
    data: parsedRows,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 60 * 1000,
    status: 'READY'
  });

  return { importToken, summary, rows: parsedRows };
};

// ─── Database Mutation Helpers ──────────────────────────────────────
const createStudentRecord = async (tx, row) => {
  let srId = null;
  if (row.interestedMajorId || row.admissionYear || row.englishCertificate || row.gpa || row.programScore) {
    const sr = await tx.specializedRegister.create({
      data: {
        interestedMajorId: row.interestedMajorId,
        specificMajorId: row.specificMajorId,
        admissionYear: row.admissionYear ? Number(row.admissionYear) : null,
        englishCertificate: row.englishCertificate,
        gpa: row.gpa,
        programScore: row.programScore
      }
    });
    srId = sr.id;
  }

  const student = await tx.student.create({
    data: {
      fullName: row.fullName,
      gender: row.gender || 'Unknown',
      email: row.email || null,
      mobile: row.mobile,
      otherPhone: row.otherPhone || null,
      birthDate: row.birthDate || null,
      primaryAddress: row.primaryAddress || null,
      specializedRegisterId: srId
    }
  });

  await tx.studentEducation.create({
    data: {
      studentId: student.id,
      schoolId: row.schoolId,
      newProvinceId: row.newProvinceId,
      countryId: row.countryId,
      provinceGroup: row.provinceGroup,
      schoolType: row.schoolType,
      class: row.class
    }
  });

  return student;
};

const createLeadWithMilestones = async (tx, studentId, row, accountId) => {
  let milestoneUpdates = {};
  if (row.statusDataId) {
    milestoneUpdates = await applyStatusTransition({ tx, lead: {}, newStatusDataId: row.statusDataId });
  }

  const createdLead = await tx.lead.create({
    data: {
      assignedToId: row.assignedToId,
      createdById: accountId || null,
      description: row.description,
      dataReceived: row.dataReceived,
      priority: row.priority || null,
      statusDataId: row.statusDataId,
      sourceDataId: row.sourceDataId,
      studentId,
      ...milestoneUpdates
    }
  });

  if (row.statusDataId) {
    await tx.leadStatusHistory.create({
      data: {
        leadId: createdLead.id,
        previousStatusId: null,
        newStatusId: row.statusDataId,
        changedById: accountId || null,
        teamId: null,
        notes: 'Initial import status',
        changedAt: new Date()
      }
    });
  }

  return createdLead;
};

const insertLeadRows = async (rows, context) => {
  const accountId = context?.accountId || null;
  let newStudentsCreated = 0;
  let newLeadsForExisting = 0;
  let skipped = 0;

  for (const row of rows) {
    const classification = row._meta?.classification;

    if (classification === 'READY_NEW_STUDENT_AND_LEAD') {
      try {
        await prisma.$transaction(async (tx) => {
          const student = await createStudentRecord(tx, row);
          await createLeadWithMilestones(tx, student.id, row, accountId);
        });
        newStudentsCreated++;
      } catch (err) {
        console.error(`Row ${row._meta?.rowNumber} failed:`, err);
        skipped++;
      }
    } else if (classification === 'READY_EXISTING_STUDENT_NEW_LEAD') {
      try {
        const student = await prisma.student.findUnique({
          where: { id: row.existingStudentId },
          include: { lead: true }
        });

        if (!student || student.lead) {
          skipped++;
          continue;
        }

        await prisma.$transaction(async (tx) => {
          await createLeadWithMilestones(tx, row.existingStudentId, row, accountId);
        });
        newLeadsForExisting++;
      } catch (err) {
        console.error(`Row ${row._meta?.rowNumber} failed:`, err);
        skipped++;
      }
    } else {
      skipped++;
    }
  }

  return {
    newStudentsCreated,
    newLeadsForExisting,
    skipped
  };
};

const confirmImportLead = async (importToken, accountId) => {
  const tokenData = importTokens.get(importToken);

  if (!tokenData) {
    const err = new Error('Import token is invalid or has expired');
    err.status = 400;
    throw err;
  }

  if (tokenData.accountId !== accountId) {
    const err = new Error('Unauthorized token');
    err.status = 403;
    throw err;
  }

  if (tokenData.status !== 'READY') {
    const err = new Error('Import is already processing or completed');
    err.status = 400;
    throw err;
  }

  tokenData.status = 'PROCESSING';

  const result = await insertLeadRows(tokenData.data, { type: 'USER', accountId });

  importTokens.delete(importToken);

  return result;
};

module.exports = {
  previewImportLead,
  confirmImportLead,
  validateLeadRows,
  insertLeadRows,

  // Compatibility aliases
  previewImportLead,
  confirmImportLead,
  validateLeadRows,
  insertLeadRows
};

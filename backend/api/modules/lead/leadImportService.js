const xlsx = require('xlsx');
const crypto = require('crypto');
const prisma = require('../../../config/db');
const {
  ProvinceGroup,
  SchoolType,
  StudentClass,
  Priority,
  EnglishCertificate,
  GPA,
  ProgramScore
} = require('@prisma/client');
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
const COLUMN_MAP = {
  'Full Name':           { key: 'fullName', required: true },
  'Mobile':              { key: 'mobile', required: true },
  'Email':               { key: 'email' },
  'Gender':              { key: 'gender' },
  'Other Phone':         { key: 'otherPhone' },
  'Birth Date':          { key: 'birthDate' },
  'Primary Address':     { key: 'primaryAddress' },
  'Priority':            { key: 'priority' },
  'Old Province':        { key: 'oldProvince' },
  'School':              { key: 'school' },
  'New Province':        { key: 'newProvince' },
  'Country':             { key: 'country' },
  'Province Group':      { key: 'provinceGroup' },
  'School Type':         { key: 'schoolType' },
  'Class':               { key: 'class' },
  'Interested Major':    { key: 'interestedMajor' },
  'Specific Major':      { key: 'specificMajor' },
  'Admission Year':      { key: 'admissionYear' },
  'English Certificate': { key: 'englishCertificate' },
  'GPA':                 { key: 'gpa' },
  'Program Score':       { key: 'programScore' },
  'Assigned To':         { key: 'assignedTo' },
  'Status Interaction':  { key: 'statusInteraction' },
  'Status General':      { key: 'statusGeneral' },
  'Status Detail':       { key: 'statusDetail' },
  'Source':              { key: 'source' },
  'Source Detail':       { key: 'sourceDetail' },
  'Approach Method':     { key: 'approachMethod' },
  'Description':         { key: 'description' },
  'Data Received':       { key: 'dataReceived' }
};

// ─── Parsing & Normalization Helpers ───────────────────────────────
const normalizeMobile = (val) => {
  if (!val) return null;
  const cleaned = String(val).trim().replace(/\D/g, '');
  if (!cleaned) return null;
  return cleaned.length === 9 && !cleaned.startsWith('0') ? '0' + cleaned : cleaned;
};

const parseExcelDate = (val) => {
  if (!val) return null;
  if (typeof val === 'number') {
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// Map file headers to lead field keys once upfront -> O(1) cell lookup
const mapImportHeaders = (firstRow) => {
  const fileHeaders = Object.keys(firstRow || {});
  const normalize = (name) => name.toLowerCase().replace(/[\s_]/g, '');

  const headerLookup = new Map(fileHeaders.map(h => [normalize(h), h]));
  const importFieldMap = {};

  for (const [headerLabel, config] of Object.entries(COLUMN_MAP)) {
    const matchedHeader = headerLookup.get(normalize(headerLabel))
                       || headerLookup.get(normalize(config.key));

    if (matchedHeader) {
      importFieldMap[config.key] = matchedHeader;
    } else if (config.required) {
      const err = new Error(`COLUMN_MISSING: Missing required header "${headerLabel}"`);
      err.status = 400;
      throw err;
    }
  }

  return importFieldMap;
};

// ─── Validation & Preview ──────────────────────────────────────────
const validateLeadRows = async (rawData) => {
  if (!rawData || rawData.length === 0) {
    const err = new Error('The uploaded file is empty');
    err.status = 400;
    throw err;
  }

  const importFieldMap = mapImportHeaders(rawData[0]);

  // 1. Extract values & parse dates
  const rows = rawData.map((rawRow, idx) => {
    const row = { _meta: { rowNumber: idx + 2, errors: [], warnings: [], raw: rawRow } };
    for (const [key, rawCol] of Object.entries(importFieldMap)) {
      const val = rawRow[rawCol];
      row[key] = typeof val === 'string' ? val.trim() : val;
    }
    row.mobile = normalizeMobile(row.mobile);
    row.birthDate = parseExcelDate(row.birthDate);
    row.dataReceived = parseExcelDate(row.dataReceived);
    return row;
  });

  // 2. Intra-file duplicate mobile check
  const mobileRowMap = new Map();
  for (const row of rows) {
    if (!row.mobile) {
      row._meta.errors.push('Mobile is required for every row');
      row._meta.classification = 'INVALID';
    } else if (mobileRowMap.has(row.mobile)) {
      row._meta.classification = 'DUPLICATE_IN_FILE';
      row._meta.errors.push(`Mobile ${row.mobile} is duplicated in row ${mobileRowMap.get(row.mobile)}`);
    } else {
      mobileRowMap.set(row.mobile, row._meta.rowNumber);
    }
  }

  // 3. Preload reference master data and index into Maps for O(1) lookups
  const mobiles = [...new Set(rows.map(r => r.mobile).filter(Boolean))];
  const [
    existingLeads,
    oldProvinces,
    schools,
    newProvinces,
    countries,
    majors,
    statuses,
    sources,
    accounts
  ] = await Promise.all([
    prisma.student.findMany({
      where: { mobile: { in: mobiles } },
      select: { mobile: true }
    }),
    prisma.oldProvince.findMany(),
    prisma.school.findMany(),
    prisma.newProvince.findMany(),
    prisma.country.findMany(),
    prisma.majorData.findMany({ where: { isActive: true } }),
    prisma.statusData.findMany({ where: { isActive: true } }),
    prisma.sourceData.findMany({ where: { isActive: true } }),
    prisma.account.findMany({ where: { isActive: true } })
  ]);

  const existingMobileNumbers = new Set(existingLeads.map(l => l.mobile));

  // Build O(1) lookup tables
  const oldProvinceMap = new Map();
  for (const p of oldProvinces) {
    oldProvinceMap.set(p.name.trim().toLowerCase(), p.id);
    oldProvinceMap.set(normalizeProvinceName(p.name), p.id);
  }

  const newProvinceMap = new Map();
  for (const p of newProvinces) {
    newProvinceMap.set(p.name.trim().toLowerCase(), p.id);
    newProvinceMap.set(normalizeProvinceName(p.name), p.id);
  }

  const schoolMap = new Map(schools.map(s => [`${s.oldProvinceId}_${s.name.trim().toLowerCase()}`, s.id]));
  const countryMap = new Map(countries.map(c => [c.name.trim().toLowerCase(), c.id]));
  const accountMap = new Map(accounts.map(a => [a.email.trim().toLowerCase(), a.id]));

  // 4. Validate each Lead as a single aggregate entity
  for (const row of rows) {
    if (row._meta.classification) continue;

    // Check duplicate existing in system ( Mobile phone )
    if (existingMobileNumbers.has(row.mobile)) {
      row._meta.classification = 'EXISTING_LEAD';
      continue;
    }

    // Required fields
    if (!row.fullName) {
      row._meta.errors.push('Full Name is required');
    }

    // Location & School mapping
    if (row.oldProvince) {
      const opId = oldProvinceMap.get(row.oldProvince.trim().toLowerCase())
                || oldProvinceMap.get(normalizeProvinceName(row.oldProvince));
      if (!opId) {
        row._meta.errors.push(`UNRESOLVED_MAPPING: Old Province "${row.oldProvince}"`);
      } else {
        row.oldProvinceId = opId;
        if (row.school) {
          const schId = schoolMap.get(`${opId}_${row.school.trim().toLowerCase()}`);
          if (!schId) {
            row._meta.errors.push(`UNRESOLVED_MAPPING: School "${row.school}" not found in province`);
          } else {
            row.schoolId = schId;
          }
        }
      }
    }

    if (row.newProvince) {
      const npId = newProvinceMap.get(row.newProvince.trim().toLowerCase())
                || newProvinceMap.get(normalizeProvinceName(row.newProvince));
      if (!npId) {
        row._meta.errors.push(`UNRESOLVED_MAPPING: New Province "${row.newProvince}"`);
      } else {
        row.newProvinceId = npId;
      }
    }

    if (row.country) {
      const cId = countryMap.get(row.country.trim().toLowerCase());
      if (!cId) {
        row._meta.errors.push(`UNRESOLVED_MAPPING: Country "${row.country}"`);
      } else {
        row.countryId = cId;
      }
    }

    // Enum validations
    const resolveEnum = (field, enumType, map, errorLabel, preTransform) => {
      if (!row[field]) return;
      let norm = normalizeEnum(row[field]);
      if (preTransform) norm = preTransform(norm);
      const mapped = (map && map[norm]) || norm;

      if (enumType[mapped]) {
        row[field] = mapped;
      } else {
        row._meta.errors.push(`Invalid ${errorLabel}: ${row[field]}`);
      }
    };

    resolveEnum('provinceGroup', ProvinceGroup, PROVINCE_MAP, 'Province Group');
    resolveEnum('schoolType', SchoolType, null, 'School Type', v => v === 'A_' ? 'A_STAR' : v);
    resolveEnum('class', StudentClass, CLASS_MAP, 'Class');
    resolveEnum('priority', Priority, null, 'Priority');
    resolveEnum('gpa', GPA, GPA_MAP, 'GPA');
    resolveEnum('programScore', ProgramScore, PROGRAM_SCORE_MAP, 'Program Score');
    resolveEnum('englishCertificate', EnglishCertificate, ENGLISH_CERT_MAP, 'English Certificate');

    // Academic Intentions validation
    const hasAcademicIntentions = Boolean(
      row.interestedMajor || row.specificMajor || row.admissionYear ||
      row.englishCertificate || row.gpa || row.programScore
    );

    if (row.interestedMajor || row.specificMajor) {
      const majorRes = resolveHierarchy(majors, ['interestedMajor', 'specificMajor'], [row.interestedMajor, row.specificMajor]);
      if (majorRes.error) {
        row._meta.errors.push(`INVALID_RELATION (Major): ${majorRes.error}`);
      } else {
        row.interestedMajorId = majorRes.resolvedIds?.[0] || null;
        row.specificMajorId = majorRes.resolvedIds?.[1] || null;
      }
    }

    if (hasAcademicIntentions && (!row.interestedMajorId || !row.specificMajorId)) {
      row._meta.errors.push('Both Interested Major and Specific Major are required when providing Academic Intentions');
    }

    // Lead assignment 
    if (row.assignedTo) {
      const accId = accountMap.get(row.assignedTo.trim().toLowerCase());
      if (!accId) {
        row._meta.errors.push(`UNRESOLVED_MAPPING: Assigned account Email "${row.assignedTo}" not found`);
      } else {
        row.assignedToId = accId;
      }
    }

    if (row.statusInteraction || row.statusGeneral || row.statusDetail) {
      const statRes = resolveHierarchy(statuses, ['interaction', 'general', 'detail'], [row.statusInteraction, row.statusGeneral, row.statusDetail]);
      if (statRes.error) {
        row._meta.errors.push(`INVALID_RELATION (Status): ${statRes.error}`);
      } else {
        row.statusDataId = statRes.resolvedId;
      }
    }

    if (row.source || row.sourceDetail || row.approachMethod) {
      const srcRes = resolveHierarchy(sources, ['source', 'sourceDetail', 'approachMethod'], [row.source, row.sourceDetail, row.approachMethod]);
      if (srcRes.error) {
        row._meta.errors.push(`INVALID_RELATION (Source): ${srcRes.error}`);
      } else {
        row.sourceDataId = srcRes.resolvedId;
      }
    }

    // Row classification
    if (row._meta.errors.length > 0) {
      const hasUnresolved = row._meta.errors.some(e => e.includes('UNRESOLVED_MAPPING') || e.includes('INVALID_RELATION'));
      row._meta.classification = hasUnresolved ? 'MAPPING_ISSUE' : 'INVALID';
    } else {
      row._meta.classification = 'READY';
    }
  }

  const summary = {
    total: rows.length,
    ready: rows.filter(r => r._meta.classification === 'READY').length,
    existingLead: rows.filter(r => r._meta.classification === 'EXISTING_LEAD').length,
    duplicateInFile: rows.filter(r => r._meta.classification === 'DUPLICATE_IN_FILE').length,
    mappingIssue: rows.filter(r => r._meta.classification === 'MAPPING_ISSUE').length,
    invalid: rows.filter(r => r._meta.classification === 'INVALID').length
  };

  return { summary, rows };
};

// ─── Database Mutation (Atomic Nested Write) ────────────────────────
const insertLeadRows = async (rows, context) => {
  const accountId = context?.accountId || null;
  let importedCount = 0;
  let skipped = 0;

  // Find fallback country if not specified
  const fallbackCountry = await prisma.country.findFirst({
    where: { OR: [{ name: { contains: 'Viet', mode: 'insensitive' } }] }
  }) || await prisma.country.findFirst();

  for (const row of rows) {
    if (row._meta?.classification !== 'READY') {
      skipped++;
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        const milestoneUpdates = row.statusDataId
          ? await applyStatusTransition({ tx, lead: {}, newStatusDataId: row.statusDataId })
          : {};

        const hasAcademic = Boolean(row.interestedMajorId && row.specificMajorId);

        const lead = await tx.lead.create({
          data: {
            description: row.description || null,
            dataReceived: row.dataReceived || null,
            priority: row.priority || null,
            ...(row.assignedToId && { assignedTo: { connect: { id: row.assignedToId } } }),
            ...(accountId && { createdBy: { connect: { id: accountId } } }),
            ...(row.statusDataId && { statusData: { connect: { id: row.statusDataId } } }),
            ...(row.sourceDataId && { sourceData: { connect: { id: row.sourceDataId } } }),
            ...milestoneUpdates,
            student: {
              create: {
                fullName: row.fullName,
                gender: row.gender || 'Unknown',
                email: row.email || null,
                mobile: row.mobile,
                otherPhone: row.otherPhone || null,
                birthDate: row.birthDate || null,
                primaryAddress: row.primaryAddress || null,
                ...(hasAcademic && {
                  specializedRegister: {
                    create: {
                      interestedMajor: { connect: { id: row.interestedMajorId } },
                      specificMajor: { connect: { id: row.specificMajorId } },
                      admissionYear: row.admissionYear ? Number(row.admissionYear) : null,
                      englishCertificate: row.englishCertificate || null,
                      gpa: row.gpa || 'OTHER',
                      programScore: row.programScore || 'OTHER'
                    }
                  }
                }),
                education: {
                  create: {
                    country: { connect: { id: row.countryId || fallbackCountry?.id } },
                    ...(row.schoolId && { school: { connect: { id: row.schoolId } } }),
                    ...(row.oldProvinceId && { oldProvince: { connect: { id: row.oldProvinceId } } }),
                    ...(row.newProvinceId && { newProvince: { connect: { id: row.newProvinceId } } }),
                    provinceGroup: row.provinceGroup || 'OTHER_PROVINCE',
                    schoolType: row.schoolType || 'NONE',
                    class: row.class || 'NONE'
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
              changedById: accountId || null,
              teamId: null,
              notes: 'Initial import status',
              changedAt: new Date()
            }
          });
        }
      });

      importedCount++;
    } catch (err) {
      console.error(`Row ${row._meta?.rowNumber} import failed:`, err);
      skipped++;
    }
  }

  return {
    importedCount,
    skipped
  };
};

// ─── Public API ─────────────────────────────────────────────────────
const previewImportLead = async (parsedData, accountId) => {
  const { summary, rows } = await validateLeadRows(parsedData);

  const importToken = crypto.randomUUID();
  importTokens.set(importToken, {
    accountId,
    data: rows,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 60 * 1000,
    status: 'READY'
  });

  return { importToken, summary, rows };
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

const generateTemplate = () => {
  const headers = Object.keys(COLUMN_MAP);
  const worksheet = xlsx.utils.aoa_to_sheet([headers]);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Import Template');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = {
  previewImportLead,
  confirmImportLead,
  validateLeadRows,
  insertLeadRows,
  generateTemplate
};

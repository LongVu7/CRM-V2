const xlsx = require('xlsx');
const { ProvinceGroup, SchoolType, StudentClass, Priority, EnglishCertificate, GPA, ProgramScore } = require('@prisma/client');
const prisma = require('../../../config/db');
const crypto = require('crypto');
const {
  normalizeEnum,
  PROVINCE_MAP,
  CLASS_MAP,
  GPA_MAP,
  PROGRAM_SCORE_MAP,
  ENGLISH_CERT_MAP
} = require('../../utils/enumMapper');
const { applyStatusTransition } = require('../../utils/statusTransition');
const { resolveHierarchy } = require('../../utils/hierarchyUtils');

const importTokens = require('../../../utils/importTokenManager');

const COLUMN_MAP = {
  'Full Name': { key: 'fullName', requiredStruct: true, requiredNew: true },
  'Gender': { key: 'gender', requiredStruct: false, requiredNew: false },
  'Email': { key: 'email', requiredStruct: true, requiredNew: false },
  'Mobile': { key: 'mobile', requiredStruct: true, requiredNew: true },
  'Other Phone': { key: 'otherPhone', requiredStruct: false, requiredNew: false },
  'Birth Date': { key: 'birthDate', requiredStruct: false, requiredNew: false },
  'Parent Phone': { key: 'parentPhone', requiredStruct: false, requiredNew: false },
  'Primary Address': { key: 'primaryAddress', requiredStruct: false, requiredNew: false },
  'Priority': { key: 'priority', requiredStruct: false, requiredNew: false },

  'Old Province': { key: 'oldProvince', requiredStruct: true, requiredNew: false },
  'School': { key: 'school', requiredStruct: true, requiredNew: true },
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

// --- Helpers ---
const normalizeMobile = (val) => {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;
  // Normalize Mobile: enforce 10 digits starting with 0.
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


const previewImportInquiry = async (fileBuffer, accountId) => {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  if (rawData.length === 0) {
    const error = new Error('The uploaded file is empty');
    error.status = 400;
    throw error;
  }

  // Validate required column headers
  const fileHeaders = Object.keys(rawData[0] || {});
  for (const [header, config] of Object.entries(COLUMN_MAP)) {
    if (config.requiredStruct && !fileHeaders.includes(header)) {
      const error = new Error(`COLUMN_MISSING: Missing required header "${header}"`);
      error.status = 400;
      throw error;
    }
  }

  // Parse and Normalize
  const parsedRows = rawData.map((row, index) => {
    const r = { _meta: { rowNumber: index + 2, errors: [], warnings: [], raw: row } };
    for (const [header, config] of Object.entries(COLUMN_MAP)) {
      r[config.key] = typeof row[header] === 'string' ? row[header].trim() : row[header];
    }
    r.mobile = normalizeMobile(r.mobile);
    r.birthDate = parseExcelDate(r.birthDate);
    r.dataReceived = parseExcelDate(r.dataReceived);
    return r;
  });

  // Check file duplicates
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

  // Pre-load reference data
  const mobiles = [...new Set(parsedRows.map(r => r.mobile).filter(Boolean))];
  const existingStudents = await prisma.student.findMany({
    where: { mobile: { in: mobiles } },
    include: { inquiry: true }
  });

  const oldProvinces = await prisma.oldProvince.findMany();
  const schools = await prisma.school.findMany();
  const newProvinces = await prisma.newProvince.findMany();
  const countries = await prisma.country.findMany();
  const majorData = await prisma.majorData.findMany({ where: { isActive: true } });
  const statusData = await prisma.statusData.findMany({ where: { isActive: true } });
  const sourceData = await prisma.sourceData.findMany({ where: { isActive: true } });
  const accounts = await prisma.account.findMany({ where: { isActive: true } });

  // Process rows
  for (const row of parsedRows) {
    if (row._meta.classification) continue; // Skip if already classified (DUPLICATE/INVALID)

    const student = existingStudents.find(s => s.mobile === row.mobile);
    const isNew = !student;

    if (!isNew && student.inquiry) {
      row._meta.classification = 'EXISTING_INQUIRY';
      continue;
    }

    // New Student Validation
    if (isNew) {
      // Row Required checks
      for (const [header, config] of Object.entries(COLUMN_MAP)) {
        if (config.requiredNew && (row[config.key] === null || row[config.key] === '' || row[config.key] === undefined)) {
          row._meta.errors.push(`MISSING_REQUIRED_FIELD: ${header} is required for new students`);
        }
      }

      // References
      if (row.oldProvince) {
        const op = oldProvinces.find(p => p.name.toLowerCase() === row.oldProvince.toLowerCase());
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
        const np = newProvinces.find(p => p.name.toLowerCase() === row.newProvince.toLowerCase());
        if (!np) row._meta.errors.push(`UNRESOLVED_MAPPING: New Province "${row.newProvince}"`);
        else row.newProvinceId = np.id;
      } else if (newProvinces.length > 0) {
        row.newProvinceId = newProvinces[0].id; // Fallback to first available New Province
      }

      if (row.country) {
        const c = countries.find(x => x.name.toLowerCase() === row.country.toLowerCase());
        if (!c) row._meta.errors.push(`UNRESOLVED_MAPPING: Country "${row.country}"`);
        else row.countryId = c.id;
      } else if (countries.length > 0) {
        row.countryId = countries[0].id; // Fallback to first available Country
      }

      // Enums (basic check and localized mapping)

      if (row.provinceGroup) {
        let norm = normalizeEnum(row.provinceGroup);
        row.provinceGroup = PROVINCE_MAP[norm] || norm;
        if (!Object.keys(ProvinceGroup).includes(row.provinceGroup)) {
          row._meta.errors.push(`Invalid Province Group: ${row.provinceGroup}`);
        }
      } else {
        row.provinceGroup = 'OTHER_PROVINCE'; // Fallback
      }

      if (row.schoolType) {
        row.schoolType = normalizeEnum(row.schoolType);
        if (row.schoolType === 'A_') row.schoolType = 'A_STAR'; // Special case for A*
        if (!Object.keys(SchoolType).includes(row.schoolType)) {
          row._meta.errors.push(`Invalid School Type: ${row.schoolType}`);
        }
      } else {
        row.schoolType = 'D'; // Fallback
      }

      if (row.class) {
        let norm = normalizeEnum(row.class);
        row.class = CLASS_MAP[norm] || norm;
        if (!Object.keys(StudentClass).includes(row.class)) {
          row._meta.errors.push(`Invalid Class: ${row.class}`);
        }
      } else {
        row.class = 'FREELANCE'; // Fallback
      }

      if (row.priority) {
        row.priority = normalizeEnum(row.priority);
        if (!Object.keys(Priority).includes(row.priority)) {
          row._meta.errors.push(`Invalid Priority: ${row.priority}`);
        }
      }

      if (row.gpa) {
        let norm = normalizeEnum(row.gpa);
        // Sometimes `<` and `>` might not be replaced by the regex.
        norm = norm.replace(/</g, '<').replace(/>/g, '>');
        row.gpa = GPA_MAP[norm] || norm;
        if (!Object.keys(GPA).includes(row.gpa)) {
          row._meta.errors.push(`Invalid GPA: ${row.gpa}`);
        }
      } else {
        row.gpa = 'OTHER'; // B/c it is a prisma required field
      }

      if (row.programScore) {
        let norm = normalizeEnum(row.programScore);
        row.programScore = PROGRAM_SCORE_MAP[norm] || norm;
        if (!Object.keys(ProgramScore).includes(row.programScore)) {
          row._meta.errors.push(`Invalid Program Score: ${row.programScore}`);
        }
      } else {
        row.programScore = 'OTHER'; // B/c it is a prisma required field
      }

      if (row.englishCertificate) {
        let norm = normalizeEnum(row.englishCertificate);
        row.englishCertificate = ENGLISH_CERT_MAP[norm] || norm;
        if (!Object.keys(EnglishCertificate).includes(row.englishCertificate)) {
          row._meta.errors.push(`Invalid English Certificate: ${row.englishCertificate}`);
        }
      } else {
        row.englishCertificate = null;
      }

      // Major Hierarchy
      if (row.interestedMajor || row.specificMajor) {
        const majorRes = resolveHierarchy(majorData, ['interestedMajor', 'specificMajor'], [row.interestedMajor, row.specificMajor]);
        if (majorRes.error) row._meta.errors.push(`INVALID_RELATION (Major): ${majorRes.error}`);
        else {
          row.interestedMajorId = majorRes.resolvedIds && majorRes.resolvedIds[0];
          row.specificMajorId = majorRes.resolvedIds && majorRes.resolvedIds[1];
        }
      }

      // Academic Intentions cross-validation
      const hasAcademicIntentions = row.interestedMajorId || row.admissionYear || row.englishCertificate || row.gpa || row.programScore;
      if (hasAcademicIntentions) {
        if (!row.interestedMajorId) row._meta.errors.push(`Interested Major is required when Academic Intentions are provided`);
      }
    } else {
      row._meta.warnings.push('Uploaded Student, Education, and Specialized Register data will be ignored as the student already exists.');
    }

    // Common Inquiry Fields Validation
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

    if (row._meta.errors.length > 0) {
      const hasUnresolved = row._meta.errors.some(e => e.includes('UNRESOLVED_MAPPING') || e.includes('INVALID_RELATION'));
      row._meta.classification = hasUnresolved ? 'MAPPING_ISSUE' : 'INVALID';
    } else {
      row._meta.classification = isNew ? 'READY_NEW_STUDENT_AND_INQUIRY' : 'READY_EXISTING_STUDENT_NEW_INQUIRY';
      // Map existing student ID for confirm logic
      if (!isNew) row.existingStudentId = student.id;
    }
  }

  // Create Token
  const importToken = crypto.randomUUID();
  importTokens.set(importToken, {
    accountId,
    data: parsedRows,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 60 * 1000,
    status: 'READY'
  });

  const summary = {
    total: parsedRows.length,
    readyNew: parsedRows.filter(r => r._meta.classification === 'READY_NEW_STUDENT_AND_INQUIRY').length,
    readyExisting: parsedRows.filter(r => r._meta.classification === 'READY_EXISTING_STUDENT_NEW_INQUIRY').length,
    existingInquiry: parsedRows.filter(r => r._meta.classification === 'EXISTING_INQUIRY').length,
    duplicateInFile: parsedRows.filter(r => r._meta.classification === 'DUPLICATE_IN_FILE').length,
    mappingIssue: parsedRows.filter(r => r._meta.classification === 'MAPPING_ISSUE').length,
    invalid: parsedRows.filter(r => r._meta.classification === 'INVALID').length,
  };

  return { importToken, summary, rows: parsedRows };
};

const confirmImportInquiry = async (importToken, accountId) => {
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

  const rows = tokenData.data;
  let newStudentsCreated = 0;
  let newInquiriesForExisting = 0;
  let skipped = 0;

  for (const row of rows) {
    if (row._meta.classification === 'READY_NEW_STUDENT_AND_INQUIRY') {
      try {
        await prisma.$transaction(async (tx) => {
          let srId = null;
          // 1. Create SR conditionally
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

          // 2. Create Student
          const student = await tx.student.create({
            data: {
              fullName: row.fullName,
              gender: row.gender || 'Unknown',
              email: row.email || null,
              mobile: row.mobile,
              otherPhone: row.otherPhone || null,
              birthDate: row.birthDate || null,
              parentPhone: row.parentPhone || null,
              primaryAddress: row.primaryAddress || null,
              specializedRegisterId: srId
            }
          });

          // 3. Create Education
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

          // 4. Create Inquiry
          let milestoneUpdates = {};
          if (row.statusDataId) {
            milestoneUpdates = await applyStatusTransition({ tx, inquiry: {}, newStatusDataId: row.statusDataId });
          }
          await tx.inquiry.create({
            data: {
              assignedToId: row.assignedToId,
              description: row.description,
              dataReceived: row.dataReceived,
              groupTele: row.groupTele,
              priority: row.priority || null,
              statusDataId: row.statusDataId,
              sourceDataId: row.sourceDataId,
              studentId: student.id,
              ...milestoneUpdates
            }
          });
        });
        newStudentsCreated++;
      } catch (err) {
        console.error(`Row ${row._meta.rowNumber} failed:`, err);
        skipped++; // e.g. unique constraint violation occurred before transaction started
      }
    }
    else if (row._meta.classification === 'READY_EXISTING_STUDENT_NEW_INQUIRY') {
      try {
        // Re-check Inquiry existence just in case
        const student = await prisma.student.findUnique({
          where: { id: row.existingStudentId },
          include: { inquiry: true }
        });

        if (!student || student.inquiry) {
          skipped++;
          continue;
        }

        await prisma.$transaction(async (tx) => {
          let milestoneUpdates = {};
          if (row.statusDataId) {
            milestoneUpdates = await applyStatusTransition({ tx, inquiry: {}, newStatusDataId: row.statusDataId });
          }
          await tx.inquiry.create({
            data: {
              assignedToId: row.assignedToId,
              description: row.description,
              dataReceived: row.dataReceived,
              groupTele: row.groupTele,
              statusDataId: row.statusDataId,
              sourceDataId: row.sourceDataId,
              studentId: row.existingStudentId,
              ...milestoneUpdates
            }
          });
        });
        newInquiriesForExisting++;
      } catch (err) {
        console.error(`Row ${row._meta.rowNumber} failed:`, err);
        skipped++;
      }
    }
    else {
      skipped++;
    }
  }

  // Cleanup token
  importTokens.delete(importToken);

  return {
    newStudentsCreated,
    newInquiriesForExisting,
    skipped
  };
};

module.exports = {
  generateTemplate,
  previewImportInquiry,
  confirmImportInquiry
};

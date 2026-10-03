const prisma = require('../../../config/db');
const crypto = require('crypto');
const importTokens = require('../../utils/importTokenManager');
const xlsx = require('xlsx');
const { buildPaginationMeta } = require('../../utils/pagination');
const {
  normalizeEnum,
  PROVINCE_MAP,
  CLASS_MAP,
  GPA_MAP,
  PROGRAM_SCORE_MAP,
  ENGLISH_CERT_MAP
} = require('../../utils/enumMapper');
const { ProvinceGroup, SchoolType, StudentClass, EnglishCertificate, GPA, ProgramScore } = require('@prisma/client');

// ─── Create a student
const createStudent = async (data) => {
  const { specializedRegister, education, parentPhone, ...studentData } = data;
  try {
    return await prisma.$transaction(async (tx) => {
      return await tx.student.create({
        data: {
          ...studentData,
          birthDate: studentData.birthDate ? new Date(studentData.birthDate) : undefined,
          ...(education && {
            education: {
              create: education
            }
          }),
          ...(specializedRegister && {
            specializedRegister: {
              create: specializedRegister
            }
          })
        },
      include: {
        education: {
          include: {
            school: { select: { id: true, name: true, oldProvince: { select: { id: true, name: true } } } },
            newProvince: { select: { id: true, name: true } },
            country: { select: { id: true, name: true } }
          }
        },
        specializedRegister: {
          include: {
            interestedMajor: { select: { id: true, name: true, label: true } },
            specificMajor: { select: { id: true, name: true, label: true } }
          }
        }
      }
    });
  });
  } catch (error) {

    if (error.code === 'P2002') {
      const fields = error.meta?.target || error.meta?.driverAdapterError?.cause?.constraint?.fields || [];
      let message = 'A student with this data already exists';
      if (fields.includes('mobile')) {
        message = `Student with mobile "${data.mobile}" already exists`;
      }
      const err = new Error(message);
      err.status = 409;
      throw err;
    }

    throw error
  }
};

//Filter function
const buildStudentWhere = ({ search, oldProvinceId, newProvinceId, countryId, provinceGroup, schoolType, birthYear, class: studentClass }) => {
  const where = {};
  
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { mobile: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
      { otherPhone: { contains: search } }
    ];
  }
  //Filter by birthYear
  if (birthYear) {
    const year = parseInt(birthYear, 10);
    where.birthDate = {
      gte: new Date(`${year}-01-01T00:00:00.000Z`),
      lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
    };
  }

  // Education filters
  if (oldProvinceId || newProvinceId || countryId || provinceGroup || schoolType || studentClass) {
    where.education = {
      ...(oldProvinceId && { school: { oldProvinceId: parseInt(oldProvinceId, 10) } }),
      ...(newProvinceId && { newProvinceId: parseInt(newProvinceId, 10) }),
      ...(countryId && { countryId: parseInt(countryId, 10) }),
      ...(provinceGroup && { provinceGroup }),
      ...(schoolType && { schoolType }),
      ...(studentClass && { class: studentClass })
    };
  }

  return where;
};

// ─── Get all students
const getAllStudents = async (filters) => {
  const { page, limit, skip, sortField, sortOrder } = filters;
  const where = buildStudentWhere(filters);

  let orderBy = { createdAt: 'desc' };
  if (sortField) {
    const order = parseInt(sortOrder) === 1 ? 'asc' : 'desc';
    const keys = sortField.split('.');
    orderBy = {};
    let current = orderBy;
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = order;
  }

  const [students, totalCount] = await prisma.$transaction([
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      include: { 
        education: {
          include: {
            school: { select: { id: true, name: true, oldProvince: { select: { id: true, name: true } } } },
            newProvince: { select: { id: true, name: true } },
            country: { select: { id: true, name: true } }
          }
        },
        specializedRegister: {
          include: {
            interestedMajor: { select: { id: true, name: true, label: true } },
            specificMajor: { select: { id: true, name: true, label: true } }
          }
        }
      },
      orderBy
    }),
    prisma.student.count({ where })
  ]);

  return {
    students,
    pagination: buildPaginationMeta(page, limit, totalCount)
  };
};

// ─── Get student by ID
const getStudentById = async (id) => {
  const student = await prisma.student.findUnique({
    where: { id: Number(id) },
    include: { 
      education: {
        include: {
          school: { select: { id: true, name: true, oldProvince: { select: { id: true, name: true } } } },
          newProvince: { select: { id: true, name: true } },
          country: { select: { id: true, name: true } }
        }
      },
      specializedRegister: {
        include: {
          interestedMajor: { select: { id: true, name: true, label: true } },
          specificMajor: { select: { id: true, name: true, label: true } }
        }
      }
    }
  });

  if (!student) {
    const err = new Error('Student not found');
    err.status = 404;
    throw err;
  }

  return student;
};

// ─── Update a student
const updateStudent = async (id, data) => {
  const { specializedRegister, education, parentPhone, ...studentData } = data;

  try {
    return await prisma.$transaction(async (tx) => {
      // First update the student details
      const studentUpdate = await tx.student.update({
        where: { id: Number(id) },
        data: {
          ...studentData,
          birthDate: studentData.birthDate ? new Date(studentData.birthDate) : studentData.birthDate,
          updatedAt: new Date(),
          ...(specializedRegister !== undefined && {
            specializedRegister: {
              upsert: {
                create: specializedRegister,
                update: specializedRegister
              }
            }
          })
        },
      });

      // Then conditionally upsert or delete the education record
      if (education !== undefined) {
        if (education === null) {
          await tx.studentEducation.deleteMany({
            where: { studentId: Number(id) }
          });
        } else {
          await tx.studentEducation.upsert({
            where: { studentId: Number(id) },
            create: {
              studentId: Number(id),
              ...education
            },
            update: {
              ...education
            }
          });
        }
      }

      // Finally, fetch and return the complete student
      return await tx.student.findUnique({
        where: { id: Number(id) },
        include: {
          education: {
            include: {
              school: { select: { id: true, name: true, oldProvince: { select: { id: true, name: true } } } },
              newProvince: { select: { id: true, name: true } },
              country: { select: { id: true, name: true } }
            }
          },
          specializedRegister: {
            include: {
              interestedMajor: { select: { id: true, name: true, label: true } },
              specificMajor: { select: { id: true, name: true, label: true } }
            }
          }
        }
      });
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const fields = error.meta?.target || error.meta?.driverAdapterError?.cause?.constraint?.fields || [];
      let message = 'A student with this data already exists';
      if (fields.includes('mobile')) {
        message = `Student with mobile "${data.mobile}" already exists`;
      }
      const err = new Error(message);
      err.status = 409;
      throw err;
    }
    throw error;
  }
};

// ─── Delete a student
const deleteStudent = async (id) => {
  const student = await prisma.student.findUnique({
    where: { id: Number(id) },
    select: { specializedRegisterId: true }
  });

  await prisma.student.delete({ where: { id: Number(id) } });

  if (student?.specializedRegisterId) {
    await prisma.specializedRegister.delete({
      where: { id: student.specializedRegisterId }
    });
  }
};


// ─── Import students analysis
const previewImportStudents = async (parsedStudents, accountId) => {
  if (parsedStudents.length === 0) {
    const error = new Error('The uploaded file is empty');
    error.status = 400;
    throw error;
  }

  // Clean and prepare rows
  const processedRows = parsedStudents.map((row) => {
    const r = { 
      ...row, 
      mobile: row.mobile || row['Mobile'],
      fullName: row.fullName || row['Full Name'],
      email: row.email || row['Email'],
      gender: row.gender || row['Gender'],
      otherPhone: row.otherPhone || row['Other Phone'],
      birthDate: row.birthDate || row['Date of Birth'] || row['Birth Date'],
      parentPhone: row.parentPhone || row['Parent Phone'],
      primaryAddress: row.primaryAddress || row['Primary Address'],
      school: row.school || row['School Name'] || row['School'],
      schoolCity: row.schoolCity || row['School City'],
      newProvince: row.newProvince || row['New Province'],
      country: row.country || row['Country'],
      provinceGroup: row.provinceGroup || row['Province Group'],
      schoolType: row.schoolType || row['School Type'],
      class: row.class || row['Class'],
      gpa: row.gpa || row['GPA'],
      englishCertificate: row.englishCertificate || row['English Certificate'],
      programScore: row.programScore || row['Program Score'],
      admissionYear: row.admissionYear || row['Admission Year'],
      interestedMajor: row.interestedMajor || row['Interested Major'],
      specificMajor: row.specificMajor || row['Specific Major'],
      _meta: { rowNumber: row._mapping?.rowNumber, errors: [], classification: null } 
    };
    
    // Normalize mobile
    if (r.mobile) {
      let cleaned = String(r.mobile).replace(/\D/g, '');
      if (cleaned.length === 9 && !cleaned.startsWith('0')) {
        cleaned = '0' + cleaned;
      }
      r.mobile = cleaned;
    }
    return r;
  });

  const mobileMap = new Map();

  // In-file duplicates and missing mobile
  for (const student of processedRows) {
    if (!student.mobile) {
      student._meta.errors.push('Mobile is required');
      student._meta.classification = 'INVALID';
    } else {
      if (mobileMap.has(student.mobile)) {
        student._meta.classification = 'DUPLICATE_IN_FILE';
        student._meta.errors.push('Duplicate mobile number found within the uploaded files.');
      } else {
        mobileMap.set(student.mobile, student._meta.rowNumber);
      }
    }
  }

  // Database duplicates
  const mobilesToCheck = Array.from(mobileMap.keys());
  let existingMobiles = new Set();
  if (mobilesToCheck.length > 0) {
    const existing = await prisma.student.findMany({
      where: { mobile: { in: mobilesToCheck } },
      select: { mobile: true }
    });
    existingMobiles = new Set(existing.map(s => s.mobile));
  }

  // References setup
  const studentsNeedingSchoolLookup = processedRows.filter(s => s.school && s.schoolCity && !s.schoolId);
  const cityLookup = new Map();
  if (studentsNeedingSchoolLookup.length > 0) {
    const cityNames = [...new Set(studentsNeedingSchoolLookup.map(s => String(s.schoolCity).trim()))];
    const cities = await prisma.oldProvince.findMany({
      where: { name: { in: cityNames, mode: 'insensitive' } },
      include: { schools: { select: { id: true, name: true } } }
    });
    cities.forEach(city => {
      const schoolMap = new Map();
      city.schools.forEach(school => {
        schoolMap.set(school.name.toLowerCase().trim(), school.id);
      });
      cityLookup.set(city.name.toLowerCase().trim(), { cityId: city.id, schools: schoolMap });
    });
  }

  const newProvinceNames = [...new Set(processedRows.map(s => String(s.newProvince || s['New Province'] || '').trim()).filter(Boolean))];
  const npLookup = new Map();
  if (newProvinceNames.length > 0) {
    const nps = await prisma.newProvince.findMany({ where: { name: { in: newProvinceNames, mode: 'insensitive' } } });
    nps.forEach(p => npLookup.set(p.name.toLowerCase().trim(), p.id));
  }

  const countryNames = [...new Set(processedRows.map(s => String(s.country || s['Country'] || '').trim()).filter(Boolean))];
  const cLookup = new Map();
  if (countryNames.length > 0) {
    const cs = await prisma.country.findMany({ where: { name: { in: countryNames, mode: 'insensitive' } } });
    cs.forEach(c => cLookup.set(c.name.toLowerCase().trim(), c.id));
  }

  const majorData = await prisma.majorData.findMany({ where: { isActive: true } });

  for (const s of processedRows) {
    if (s._meta.classification) continue; // Skip already invalid/duplicate_in_file

    // Database Duplicate
    if (existingMobiles.has(s.mobile)) {
      s._meta.classification = 'EXISTING_STUDENT';
      s._meta.errors.push('Mobile number already exists in the database. Record will be skipped.');
      continue;
    }

    // Required fields check
    if (!s.fullName) s._meta.errors.push('Full Name is required');
    if (!s.school) s._meta.errors.push('School is required');

    // School mapping
    if (s.school && s.schoolCity && !s.schoolId) {
      const cityKey = String(s.schoolCity).toLowerCase().trim();
      const schoolKey = String(s.school).toLowerCase().trim();
      const cityEntry = cityLookup.get(cityKey);
      if (!cityEntry) {
        s._meta.errors.push(`UNRESOLVED_MAPPING: City "${s.schoolCity}" not found.`);
      } else {
        const schoolId = cityEntry.schools.get(schoolKey);
        if (schoolId) s.schoolId = schoolId;
        else s._meta.errors.push(`UNRESOLVED_MAPPING: School "${s.school}" not found in city "${s.schoolCity}".`);
      }
    }

    // Province mapping
    const npStr = String(s.newProvince || s['New Province'] || '').trim();
    if (npStr) {
      const id = npLookup.get(npStr.toLowerCase());
      if (id) s.newProvinceId = id;
      else s._meta.errors.push(`UNRESOLVED_MAPPING: New Province "${npStr}" not found.`);
    }

    // Country mapping
    const cStr = String(s.country || s['Country'] || '').trim();
    if (cStr) {
      const id = cLookup.get(cStr.toLowerCase());
      if (id) s.countryId = id;
      else s._meta.errors.push(`UNRESOLVED_MAPPING: Country "${cStr}" not found.`);
    }

    // Enums
    let pgVal = s.provinceGroup || s['Province Group'];
    if (pgVal) {
      let norm = normalizeEnum(pgVal);
      s.provinceGroup = PROVINCE_MAP[norm] || norm;
      if (!Object.keys(ProvinceGroup).includes(s.provinceGroup)) s._meta.errors.push(`Invalid Province Group: ${pgVal}`);
    }
    
    let stVal = s.schoolType || s['School Type'];
    if (stVal) {
      stVal = normalizeEnum(stVal);
      if (stVal === 'A_') stVal = 'A_STAR';
      s.schoolType = stVal;
      if (!Object.keys(SchoolType).includes(s.schoolType)) s._meta.errors.push(`Invalid School Type: ${s.schoolType || stVal}`);
    }
    
    let clsVal = s.class || s['Class'];
    if (clsVal) {
      let norm = normalizeEnum(clsVal);
      s.class = CLASS_MAP[norm] || norm;
      if (!Object.keys(StudentClass).includes(s.class)) s._meta.errors.push(`Invalid Class: ${clsVal}`);
    }

    let gpaVal = s.gpa || s['GPA'];
    if (gpaVal) {
      let norm = normalizeEnum(gpaVal);
      norm = norm.replace(/</g, '<').replace(/>/g, '>'); 
      s.gpa = GPA_MAP[norm] || norm;
    }

    let psVal = s.programScore || s['Program Score'];
    if (psVal) {
      let norm = normalizeEnum(psVal);
      s.programScore = PROGRAM_SCORE_MAP[norm] || norm;
    }

    let ecVal = s.englishCertificate || s['English Certificate'];
    if (ecVal) {
      let norm = normalizeEnum(ecVal);
      s.englishCertificate = ENGLISH_CERT_MAP[norm] || norm;
    }

    let intMajor = s.interestedMajor || s['Interested Major'];
    let specMajor = s.specificMajor || s['Specific Major'];
    if (intMajor || specMajor) {
      const im = majorData.find(m => m.level === 'interestedMajor' && m.name.toLowerCase() === (intMajor || '').toLowerCase().trim());
      let sm;
      if (im) {
        s.interestedMajorId = im.id;
        if (specMajor) {
          sm = majorData.find(m => m.level === 'specificMajor' && m.name.toLowerCase() === (specMajor || '').toLowerCase().trim() && m.parentId === im.id);
          if (sm) s.specificMajorId = sm.id;
          else s._meta.errors.push(`UNRESOLVED_MAPPING: Specific Major "${specMajor}" not found.`);
        }
      } else {
        s._meta.errors.push(`UNRESOLVED_MAPPING: Interested Major "${intMajor}" not found.`);
      }
    }

    const hasAcademicIntentions = s.gpa || s.programScore || s.englishCertificate || s.admissionYear || s.interestedMajorId;
    if (hasAcademicIntentions) {
      if (!s.interestedMajorId) s._meta.errors.push('Interested Major is required when providing academic intentions.');
      if (!s.specificMajorId) s._meta.errors.push('Specific Major is required when providing academic intentions.');
    }

    if (s._meta.errors.length > 0) {
      const hasUnresolved = s._meta.errors.some(e => e.includes('UNRESOLVED_MAPPING'));
      s._meta.classification = hasUnresolved ? 'MAPPING_ISSUE' : 'INVALID';
    } else {
      s._meta.classification = 'READY_NEW';
    }
  }

  // Create Token
  const importToken = crypto.randomUUID();
  importTokens.set(importToken, {
    accountId,
    data: processedRows,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 60 * 1000,
    status: 'READY'
  });

  const summary = {
    total: processedRows.length,
    readyNew: processedRows.filter(r => r._meta.classification === 'READY_NEW').length,
    existingStudent: processedRows.filter(r => r._meta.classification === 'EXISTING_STUDENT').length,
    duplicateInFile: processedRows.filter(r => r._meta.classification === 'DUPLICATE_IN_FILE').length,
    mappingIssue: processedRows.filter(r => r._meta.classification === 'MAPPING_ISSUE').length,
    invalid: processedRows.filter(r => r._meta.classification === 'INVALID').length,
  };

  return { importToken, summary, rows: processedRows };
};


// ─── Process confirmed import
const confirmImportStudents = async (importToken, accountId) => {
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

  let insertedCount = 0;
  let skipped = 0;

  for (const row of rows) {
    if (row._meta.classification === 'READY_NEW') {
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
              otherPhone: row.otherPhone || row.parentPhone || null,
              birthDate: row.birthDate || null,
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
        });
        insertedCount++;
      } catch (err) {
        console.error(`Row ${row._meta.rowNumber} failed:`, err);
        skipped++;
      }
    } else {
      skipped++;
    }
  }

  importTokens.delete(importToken);

  return { insertedCount, skipped };
};

// ─── Export students
const exportStudents = async (filters) => {
  const where = buildStudentWhere(filters);
  const students = await prisma.student.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      specializedRegister: {
        include: {
          interestedMajor: true,
          specificMajor: true
        }
      },
      education: {
        include: {
          school: { include: { oldProvince: true } },
          newProvince: true,
          country: true
        }
      }
    }
  });

  return students.map(s => ({
    // 'Student ID': s.id,
    'Full Name': s.fullName || '',
    'Gender': s.gender || '',
    'Email': s.email || '',
    'Mobile': s.mobile || '',
    'Other Phone': s.otherPhone || '',
    'Date of Birth': s.birthDate ? s.birthDate.toISOString().split('T')[0] : '',
    'Parent Phone': s.otherPhone || '',
    'Primary Address': s.primaryAddress || '',
    
    // Education
    'School Name': s.education?.school?.name || '',
    'School City': s.education?.school?.oldProvince?.name || '',
    'New Province': s.education?.newProvince?.name || '',
    'Country': s.education?.country?.name || '',
    'Province Group': s.education?.provinceGroup || '',
    'School Type': s.education?.schoolType || '',
    'Class': s.education?.class || '',
    
    // Specialized Register
    'GPA': s.specializedRegister?.gpa || '',
    'English Certificate': s.specializedRegister?.englishCertificate || '',
    'Program Score': s.specializedRegister?.programScore || '',
    'Admission Year': s.specializedRegister?.admissionYear || '',
    'Interested Major': s.specializedRegister?.interestedMajor?.name || '',
    'Specific Major': s.specializedRegister?.specificMajor?.name || '',
    
    'Created At': s.createdAt ? s.createdAt.toISOString().split('T')[0] : '',
    'Updated At': s.updatedAt ? s.updatedAt.toISOString().split('T')[0] : ''
  }));
};

module.exports = {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  previewImportStudents,
  confirmImportStudents,
  exportStudents
}; 

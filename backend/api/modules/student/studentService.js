const prisma = require('../../../config/db');
const xlsx = require('xlsx');
const { buildPaginationMeta } = require('../../utils/pagination');
const {
  removeVietnameseTones,
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
  const { specializedRegister, education, ...studentData } = data;
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
            interestedMajor: { select: { id: true, name: true } },
            specificMajor: { select: { id: true, name: true } }
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


const buildStudentWhere = ({ search, oldProvinceId, newProvinceId, countryId, provinceGroup, schoolType, birthYear, class: studentClass }) => {
  const where = {};
  
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { mobile: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
      { parentPhone: { contains: search } }
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
            interestedMajor: { select: { id: true, name: true } },
            specificMajor: { select: { id: true, name: true } }
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
          interestedMajor: { select: { id: true, name: true } },
          specificMajor: { select: { id: true, name: true } }
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
  const { specializedRegister, education, ...studentData } = data;

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
              interestedMajor: { select: { id: true, name: true } },
              specificMajor: { select: { id: true, name: true } }
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
const analyzeImport = async (parsedStudents) => {
  const duplicates = [];
  const mobileMap = new Map();

  // Check duplicate mobile numbers in the uploaded files
  parsedStudents.forEach((student) => {
    if (student.mobile) {
      if (mobileMap.has(student.mobile)) {
        mobileMap.get(student.mobile).push(student);
      } else {
        mobileMap.set(student.mobile, [student]);
      }
    }
  });

  for (const [mobile, studentsWithMobile] of mobileMap.entries()) {
    if (studentsWithMobile.length > 1) {
      studentsWithMobile.forEach(student => {
        duplicates.push({
          mobile: student.mobile,
          fullName: student.fullName,
          fileName: student._mapping?.fileName,
          rowNumber: student._mapping?.rowNumber,
          duplicatedType: 'file',
          message: 'Duplicate mobile number found within the uploaded files.'
        });
      });
    }
  }

  // Check duplicate mobile numbers in the database
  const mobilesToCheck = Array.from(mobileMap.keys());
  let existingMobiles = new Set();

  if (mobilesToCheck.length > 0) {
    const existing = await prisma.student.findMany({
      where: { mobile: { in: mobilesToCheck } },
      select: { mobile: true }
    });
    existingMobiles = new Set(existing.map(s => s.mobile));
  }

  parsedStudents.forEach(student => {
    if (student.mobile && existingMobiles.has(student.mobile)) {
      duplicates.push({
        mobile: student.mobile,
        fullName: student.fullName,
        fileName: student._mapping?.fileName,
        rowNumber: student._mapping?.rowNumber,
        duplicatedType: 'db',
        message: 'Mobile number already exists in the database. Record will be updated.'
      });
    }
  });

  // ─── Resolve schoolCity + school names to schoolId ───
  const schoolWarnings = [];
  const studentsNeedingSchoolLookup = parsedStudents.filter(
    s => s.school && s.schoolCity && !s.schoolId
  );

  if (studentsNeedingSchoolLookup.length > 0) {
    // Get unique city names
    const cityNames = [...new Set(studentsNeedingSchoolLookup.map(s => String(s.schoolCity).trim()))];
    
    // Fetch cities with their schools in one query
    const cities = await prisma.oldProvince.findMany({
      where: { name: { in: cityNames, mode: 'insensitive' } },
      include: { schools: { select: { id: true, name: true } } }
    });

    // Build lookup: cityName (lowercase) → { cityId, schools: Map<schoolName(lowercase), schoolId> }
    const cityLookup = new Map();
    cities.forEach(city => {
      const schoolMap = new Map();
      city.schools.forEach(school => {
        schoolMap.set(school.name.toLowerCase().trim(), school.id);
      });
      cityLookup.set(city.name.toLowerCase().trim(), { cityId: city.id, schools: schoolMap });
    });

    // Resolve each student's schoolId
    for (const student of parsedStudents) {
      if (student.school && student.schoolCity && !student.schoolId) {
        const cityKey = String(student.schoolCity).toLowerCase().trim();
        const schoolKey = String(student.school).toLowerCase().trim();
        const cityEntry = cityLookup.get(cityKey);

        if (!cityEntry) {
          schoolWarnings.push({
            mobile: student.mobile,
            fullName: student.fullName,
            fileName: student._mapping?.fileName,
            rowNumber: student._mapping?.rowNumber,
            message: `City "${student.schoolCity}" not found in database.`
          });
        } else {
          const schoolId = cityEntry.schools.get(schoolKey);
          if (schoolId) {
            student.schoolId = schoolId;
          } else {
            schoolWarnings.push({
              mobile: student.mobile,
              fullName: student.fullName,
              fileName: student._mapping?.fileName,
              rowNumber: student._mapping?.rowNumber,
              message: `School "${student.school}" not found in city "${student.schoolCity}".`
            });
          }
        }
      }
    }
  }

  // ─── Resolve newProvince and country ───
  const newProvinceNames = [...new Set(parsedStudents.map(s => String(s.newProvince || s['New Province'] || '').trim()).filter(Boolean))];
  const countryNames = [...new Set(parsedStudents.map(s => String(s.country || s['Country'] || '').trim()).filter(Boolean))];

  if (newProvinceNames.length > 0) {
    const nps = await prisma.newProvince.findMany({ where: { name: { in: newProvinceNames, mode: 'insensitive' } } });
    const npLookup = new Map(nps.map(p => [p.name.toLowerCase().trim(), p.id]));
    for (const s of parsedStudents) {
      const p = String(s.newProvince || s['New Province'] || '').trim();
      if (p) {
        const id = npLookup.get(p.toLowerCase());
        if (id) s.newProvinceId = id;
        else schoolWarnings.push({ mobile: s.mobile, fullName: s.fullName, fileName: s._mapping?.fileName, rowNumber: s._mapping?.rowNumber, message: `New Province "${p}" not found.` });
      }
    }
  }

  if (countryNames.length > 0) {
    const cs = await prisma.country.findMany({ where: { name: { in: countryNames, mode: 'insensitive' } } });
    const cLookup = new Map(cs.map(c => [c.name.toLowerCase().trim(), c.id]));
    for (const s of parsedStudents) {
      const c = String(s.country || s['Country'] || '').trim();
      if (c) {
        const id = cLookup.get(c.toLowerCase());
        if (id) s.countryId = id;
        else schoolWarnings.push({ mobile: s.mobile, fullName: s.fullName, fileName: s._mapping?.fileName, rowNumber: s._mapping?.rowNumber, message: `Country "${c}" not found.` });
      }
    }
  }

  const majorData = await prisma.majorData.findMany({ where: { isActive: true } });

  for (const s of parsedStudents) {
    let pgVal = s.provinceGroup || s['Province Group'];
    if (pgVal) {
      let norm = normalizeEnum(pgVal);
      s.provinceGroup = PROVINCE_MAP[norm] || norm;
      if (!Object.keys(ProvinceGroup).includes(s.provinceGroup)) {
        schoolWarnings.push({ mobile: s.mobile, fullName: s.fullName, fileName: s._mapping?.fileName, rowNumber: s._mapping?.rowNumber, message: `Invalid Province Group: ${pgVal}` });
      }
    }
    
    let stVal = s.schoolType || s['School Type'];
    if (stVal) {
      stVal = normalizeEnum(stVal);
      if (stVal === 'A_') stVal = 'A_STAR';
      s.schoolType = stVal;
      if (!Object.keys(SchoolType).includes(s.schoolType)) {
        schoolWarnings.push({ mobile: s.mobile, fullName: s.fullName, fileName: s._mapping?.fileName, rowNumber: s._mapping?.rowNumber, message: `Invalid School Type: ${s.schoolType || stVal}` });
      }
    }
    
    let clsVal = s.class || s['Class'];
    if (clsVal) {
      let norm = normalizeEnum(clsVal);
      s.class = CLASS_MAP[norm] || norm;
      if (!Object.keys(StudentClass).includes(s.class)) {
        schoolWarnings.push({ mobile: s.mobile, fullName: s.fullName, fileName: s._mapping?.fileName, rowNumber: s._mapping?.rowNumber, message: `Invalid Class: ${clsVal}` });
      }
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
          if (sm) {
            s.specificMajorId = sm.id;
          } else {
            schoolWarnings.push({ mobile: s.mobile, fullName: s.fullName, fileName: s._mapping?.fileName, rowNumber: s._mapping?.rowNumber, message: `Specific Major "${specMajor}" not found under Interested Major "${intMajor}".` });
          }
        }
      } else {
        schoolWarnings.push({ mobile: s.mobile, fullName: s.fullName, fileName: s._mapping?.fileName, rowNumber: s._mapping?.rowNumber, message: `Interested Major "${intMajor}" not found.` });
      }
    }

    const hasAcademicIntentions = s.gpa || s.programScore || s.englishCertificate || s.admissionYear || s.interestedMajorId;
    if (hasAcademicIntentions) {
      if (!s.interestedMajorId) {
        schoolWarnings.push({ mobile: s.mobile, fullName: s.fullName, fileName: s._mapping?.fileName, rowNumber: s._mapping?.rowNumber, message: 'Interested Major is required when providing academic intentions (GPA, Program Score, etc.).' });
      }
      if (!s.specificMajorId) {
        schoolWarnings.push({ mobile: s.mobile, fullName: s.fullName, fileName: s._mapping?.fileName, rowNumber: s._mapping?.rowNumber, message: 'Specific Major is required when providing academic intentions.' });
      }
    }
  }

  return {
    totalParsed: parsedStudents.length,
    duplicateCount: duplicates.length,
    duplicates,
    schoolWarnings,
    parsedStudents
  };
};

// ─── Process confirmed import
const processImport = async (students) => {
  // 1. Re-validate
  const mobileSet = new Set();
  const validStudents = [];

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    if (!s.mobile) {
      const err = new Error(`Row ${i + 1} (${s.fullName || 'Unknown'}): Mobile number is required.`);
      err.status = 400;
      throw err;
    }

    if (mobileSet.has(s.mobile)) {
      const err = new Error(`Duplicate mobile number (${s.mobile}) found in the confirmation payload.`);
      err.status = 400;
      throw err;
    }
    mobileSet.add(s.mobile);

    // Clean up non-db fields before saving
    const { _mapping, ...dbData } = s;
    validStudents.push(dbData);
  }

  // 2. Perform Transaction
  const existingRecords = await prisma.student.findMany({
    where: { mobile: { in: Array.from(mobileSet) } },
    select: { mobile: true }
  });
  const existingMobiles = new Set(existingRecords.map(r => r.mobile));

  let insertedCount = 0;
  let updatedCount = 0;

  const transactionOperations = validStudents.map(studentData => {
    // Separate SpecializedRegister fields and Excel-only lookup fields from Student fields
    // Accept both interestedMajor/specificMajor (legacy) and interestedMajorId/specificMajorId
    const { 
      specializedRegister: existingSR, 
      gpa, englishCertificate, 
      interestedMajor, specificMajor,
      interestedMajorId, specificMajorId,
      admissionYear, programScore,
      schoolId, newProvinceId, countryId,
      school: _school, schoolCity: _schoolCity,  // Excel-only lookup fields (already resolved to schoolId)
      newProvince: _np, 'New Province': _np2,
      country: _c, 'Country': _c2,
      provinceGroup, 'Province Group': _pg,
      schoolType, 'School Type': _st,
      class: studentClass, 'Class': _cls,
      ...dbData 
    } = studentData;

    let pgVal = provinceGroup || _pg;
    let stVal = schoolType || _st;
    let clsVal = studentClass || _cls;

    // Build SR fields — convert empty strings to null for enum fields
    const cleanEnum = (val) => (val === '' || val === null || val === undefined) ? undefined : val;
    const cleanInt = (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const n = Number(val);
      return isNaN(n) ? undefined : n;
    };

    const srFields = {};
    const gpaVal = cleanEnum(gpa);
    const englishCertVal = cleanEnum(englishCertificate);
    const programScoreVal = cleanEnum(programScore);
    const admissionYearVal = cleanInt(admissionYear);
    const interestedMajorIdVal = cleanInt(interestedMajorId || interestedMajor);
    const specificMajorIdVal = cleanInt(specificMajorId || specificMajor);

    if (gpaVal !== undefined) srFields.gpa = gpaVal;
    if (englishCertVal !== undefined) srFields.englishCertificate = englishCertVal;
    if (programScoreVal !== undefined) srFields.programScore = programScoreVal;
    if (admissionYearVal !== undefined) srFields.admissionYear = admissionYearVal;
    if (interestedMajorIdVal !== undefined) srFields.interestedMajorId = interestedMajorIdVal;
    if (specificMajorIdVal !== undefined) srFields.specificMajorId = specificMajorIdVal;

    const hasAcademicIntentions = Object.keys(srFields).length > 0;
    
    if (hasAcademicIntentions) {
      if (srFields.interestedMajorId === undefined && !existingSR?.interestedMajorId) {
        const err = new Error(`Row ${i + 1} (${s.fullName}): Interested Major is required when providing academic intentions (GPA, Program Score, etc.).`);
        err.status = 400;
        throw err;
      }
      if (srFields.specificMajorId === undefined && !existingSR?.specificMajorId) {
        const err = new Error(`Row ${i + 1} (${s.fullName}): Specific Major is required when providing academic intentions.`);
        err.status = 400;
        throw err;
      }
    }

    const specializedRegister = hasAcademicIntentions 
      ? { ...(existingSR || {}), ...srFields } 
      : existingSR;

    if (existingMobiles.has(dbData.mobile)) {
      updatedCount++;
    } else {
      insertedCount++;
    }
    
    // Convert string to Date if needed
    if (dbData.birthDate) {
      dbData.birthDate = new Date(dbData.birthDate);
    }
    
    const educationUpsert = (schoolId !== undefined || newProvinceId !== undefined) ? {
      upsert: {
        create: {
          schoolId: schoolId === null ? undefined : schoolId,
          newProvinceId: newProvinceId,
          countryId: countryId,
          provinceGroup: pgVal,
          schoolType: stVal,
          class: clsVal
        },
        update: {
          ...(schoolId !== undefined && { schoolId: schoolId === null ? null : schoolId }),
          ...(newProvinceId !== undefined && { newProvinceId }),
          ...(countryId !== undefined && { countryId }),
          ...(pgVal !== undefined && { provinceGroup: pgVal }),
          ...(stVal !== undefined && { schoolType: stVal }),
          ...(clsVal !== undefined && { class: clsVal })
        }
      }
    } : undefined;

    return prisma.student.upsert({
      where: { mobile: dbData.mobile },
      update: {
        ...dbData,
        ...(educationUpsert && { education: educationUpsert }),
        ...(specializedRegister && {
          specializedRegister: {
            upsert: {
              create: specializedRegister,
              update: specializedRegister
            }
          }
        })
      },
      create: {
        ...dbData,
        ...((schoolId !== undefined || newProvinceId !== undefined) ? {
          education: {
            create: {
              schoolId: schoolId || undefined,
              newProvinceId: newProvinceId,
              countryId: countryId,
              provinceGroup: pgVal,
              schoolType: stVal,
              class: clsVal
            }
          }
        } : {}),
        ...(specializedRegister && {
          specializedRegister: {
            create: specializedRegister
          }
        })
      }
    });
  });

  await prisma.$transaction(transactionOperations);

  return { insertedCount, updatedCount };
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
    'Student ID': s.id,
    'Full Name': s.fullName || '',
    'Gender': s.gender || '',
    'Email': s.email || '',
    'Mobile': s.mobile || '',
    'Other Phone': s.otherPhone || '',
    'Date of Birth': s.birthDate ? s.birthDate.toISOString().split('T')[0] : '',
    'Parent Phone': s.parentPhone || '',
    'Primary Address': s.primaryAddress || '',
    
    // Education
    'School Name': s.education?.school?.name || '',
    'School City': s.education?.newProvince?.name || '',
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
  analyzeImport,
  processImport,
  exportStudents
}; 

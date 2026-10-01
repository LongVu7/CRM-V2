const { z } = require('zod');

const dateString = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Must be a valid date string'
});



const { EnglishCertificate, GPA, ProgramScore, SchoolType, ProvinceGroup, Priority, StudentClass } = require('@prisma/client');

const capitalizeName = (str) => {
  if (typeof str !== 'string' || !str.trim()) return str;
  return str.trim().split(/\s+/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

const optionalMobileString = z.preprocess(
  (val) => (val === '' || val === null ? null : val),
  z.string()
    .length(10, 'Mobile number must be exactly 10 digits long')
    .startsWith('0', 'Mobile number must start with 0')
    .regex(/^\d+$/, 'Mobile number must contain only numbers')
    .nullable()
    .optional()
);

const mobileString = z.preprocess(
  (val) => (val === '' || val === null ? undefined : val),
  z.string({ required_error: 'mobile is required' })
    .length(10, 'Mobile number must be exactly 10 digits long')
    .startsWith('0', 'Mobile number must start with 0')
    .regex(/^\d+$/, 'Mobile number must contain only numbers')
);

const specializedRegisterSchema = z.object({
  interestedMajorId: z.number().int().positive('interestedMajorId must be a positive integer'),
  specificMajorId: z.number().int().positive('specificMajorId must be a positive integer'),
  admissionYear: z.preprocess(
    (val) => (val === '' || val === null ? null : (val === undefined ? undefined : Number(val))),
    z.number().int().nullable().optional()
  ),
  englishCertificate: z.enum(EnglishCertificate).nullable().optional(),
  gpa: z.enum(GPA),
  programScore: z.enum(ProgramScore)
}).strict();

const educationSchema = z.object({
  schoolId: z.number().int().positive('schoolId must be a positive integer').nullable().optional(),
  newProvinceId: z.number().int().positive('newProvinceId must be a positive integer'),
  countryId: z.number().int().positive('countryId must be a positive integer'),
  provinceGroup: z.enum(ProvinceGroup),
  schoolType: z.enum(SchoolType),
  class: z.enum(StudentClass)
}).strict();


const createStudentSchema = z.object({
  fullName: z.string({
    required_error: 'fullName is required',
    invalid_type_error: 'fullName must be a string'
  }).min(1, 'fullName is required').max(255).transform(capitalizeName),
  gender: z.string().max(20),
  email: z.email('email must be a valid email address').max(255).nullable().optional(),
  mobile: mobileString,
  otherPhone: optionalMobileString,
  birthDate: dateString.nullable().optional(),
  parentPhone: optionalMobileString,
  primaryAddress: z.string().max(255).nullable().optional(),
  education: educationSchema,
  specializedRegister: specializedRegisterSchema,

}).strict();

const updateStudentSchema = z.object({
  fullName: z.string().min(1).max(255).optional().transform((val) => val ? capitalizeName(val) : val),
  gender: z.string().max(20).optional(),
  email: z.email('email must be a valid email address').max(255).nullable().optional(),
  mobile: mobileString.optional(),
  otherPhone: optionalMobileString.optional(),
  birthDate: dateString.nullable().optional(),
  parentPhone: optionalMobileString.optional(),
  primaryAddress: z.string().max(255).nullable().optional(),  education: educationSchema.optional(),
  specializedRegister: specializedRegisterSchema.optional(),

}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Request body cannot be empty' }
);

// Helper: preprocess empty strings to undefined for enum fields
const cleanEnumForImport = (enumObj) => z.preprocess(
  (val) => (val === '' || val === null ? undefined : val),
  z.enum(enumObj).optional()
);

const importStudentSchema = z.object({
  fullName: z.string({
    required_error: 'fullName is required',
    invalid_type_error: 'fullName must be a string'
  }).min(1, 'fullName is required').max(255).transform(capitalizeName),
  gender: z.string().max(20).optional(),
  email: z.preprocess((val) => (val === '' ? undefined : val), z.email('email must be a valid email address').max(255).optional()),
  mobile: mobileString,
  otherPhone: optionalMobileString.optional(),
  birthDate: dateString.optional(),
  parentPhone: optionalMobileString.optional(),
  primaryAddress: z.string().max(255).optional(),
  education: educationSchema.optional(),
  specializedRegister: specializedRegisterSchema.optional(),
  // Flat SR fields from Excel columns — preprocessed to handle empty strings
  gpa: cleanEnumForImport(GPA),
  englishCertificate: cleanEnumForImport(EnglishCertificate),
  programScore: cleanEnumForImport(ProgramScore),
  admissionYear: z.preprocess(
    (val) => (val === '' || val === null ? undefined : (val === undefined ? undefined : Number(val))),
    z.number().int().optional()
  ),
  interestedMajorId: z.preprocess(
    (val) => (val === '' || val === null ? undefined : (val === undefined ? undefined : Number(val))),
    z.number().int().positive().optional()
  ),
  specificMajorId: z.preprocess(
    (val) => (val === '' || val === null ? undefined : (val === undefined ? undefined : Number(val))),
    z.number().int().positive().optional()
  ),
  interestedMajor: z.any().optional(),
  specificMajor: z.any().optional(),
  // Excel-only columns for school name lookup (resolved to schoolId during preview)
  schoolCity: z.preprocess((val) => (val === '' ? undefined : val), z.string().max(255).optional()),
  school: z.preprocess((val) => (val === '' ? undefined : val), z.string().max(255).optional()),
  newProvince: z.preprocess((val) => (val === '' ? undefined : val), z.string().max(255).optional()),
  country: z.preprocess((val) => (val === '' ? undefined : val), z.string().max(255).optional()),
  provinceGroup: cleanEnumForImport(ProvinceGroup),
  schoolType: cleanEnumForImport(SchoolType),
  "class": cleanEnumForImport(StudentClass),

}).passthrough();

const importStudentsPayloadSchema = z.object({
  students: z.array(importStudentSchema).min(1, 'At least one student must be provided for import')
});

module.exports = { createStudentSchema, updateStudentSchema, importStudentsPayloadSchema };



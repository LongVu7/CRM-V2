const fs = require('fs');
const studentService = require('./studentService');
const { parseExcelFiles } = require('../../utils/excelParser');
const { parsePagination } = require('../../utils/pagination');
const { generateExcelBuffer } = require('../../utils/exportUtils');

// Helper: translate service errors to HTTP responses
const handleError = (res, error) => {
  const status = error.status || 500;
  res.status(status).json({ 
    error: error.message,
    ...(status === 500 && { details: error.message }) });
};

const createStudent = async (req, res) => {
  try {
    const student = await studentService.createStudent(req.body);
    res.status(201).json({
      message: 'Student created successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      student
    });
  } catch (error) {
    handleError(res, error);
  }
};


const getAllStudents = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filters = {
      page, limit, skip,
      search: req.query.search || '',
      sortField: req.query.sortField || null,
      sortOrder: req.query.sortOrder ? parseInt(req.query.sortOrder, 10) : null,
      oldProvinceId: req.query.oldProvinceId || null,
      newProvinceId: req.query.newProvinceId || null,
      countryId: req.query.countryId || null,
      provinceGroup: req.query.provinceGroup || null,
      schoolType: req.query.schoolType || null,
      birthYear: req.query.birthYear || null,
      class: req.query.class || null,
    };

    const { students, pagination } = await studentService.getAllStudents(filters);

    res.status(200).json({
      message: 'Students retrieved successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data: students,
      pagination
    });
  } catch (error) {
    handleError(res, error);
  }
};

const exportStudents = async (req, res) => {
  try {
    const filters = {
      search: req.query.search || '',
      oldProvinceId: req.query.oldProvinceId || null,
      newProvinceId: req.query.newProvinceId || null,
      countryId: req.query.countryId || null,
      provinceGroup: req.query.provinceGroup || null,
      schoolType: req.query.schoolType || null,
      birthYear: req.query.birthYear || null,
      class: req.query.class || null,
    };

    const data = await studentService.exportStudents(filters);
    const buffer = generateExcelBuffer(data, 'Students');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="students-${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    handleError(res, error);
  }
};

const getStudentById = async (req, res) => {
  try {
    const data = await studentService.getStudentById(req.params.id);
    res.status(200).json({
      message: 'Student retrieved successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

const updateStudent = async (req, res) => {
  try {
    const data = await studentService.updateStudent(req.params.id, req.body);
    res.status(200).json({
      message: 'Student updated successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

const deleteStudent = async (req, res) => {
  try {
    await studentService.deleteStudent(req.params.id);
    res.status(200).json({
      message: 'Student deleted successfully',
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId
    });
  } catch (error) {
    handleError(res, error);
  }
};

const previewImport = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const parsedStudents = parseExcelFiles(req.files);

    // Clean up uploaded files after processing
    req.files.forEach(f => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });

    const analysis = await studentService.analyzeImport(parsedStudents);

    res.status(200).json({
      message: 'Analysis complete. Please review data before confirming.',
      ...analysis
    });
  } catch (error) {
    if (req.files) {
      req.files.forEach(f => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
    }
    handleError(res, error);
  }
};

const confirmImport = async (req, res) => {
  try {
    const { students } = req.body;
    
    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'No student data provided for import' });
    }

    const result = await studentService.processImport(students);

    res.status(200).json({
      message: 'Import successful',
      insertedCount: result.insertedCount,
      updatedCount: result.updatedCount
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  createStudent,
  getAllStudents,
  exportStudents,
  updateStudent,
  deleteStudent,
  previewImport,
  confirmImport,
  getStudentById
};

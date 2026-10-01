const schoolService = require('./schoolService');
const { parsePagination } = require('../../utils/pagination');

const handleError = (res, error) => {
  const status = error.status || 500;
  res.status(status).json({
    error: error.message,
    ...(status === 500 && { details: error.message })
  });
};

const getAllSchools = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { oldProvinceId, search } = req.query;

    const { schools, pagination } = await schoolService.getAllSchools({ page, limit, skip, oldProvinceId, search });

    res.status(200).json({
      message: 'Schools retrieved successfully',
      data: schools,
      pagination
    });
  } catch (error) {
    handleError(res, error);
  }
};

const getSchoolOptions = async (req, res) => {
  try {
    const { oldProvinceId } = req.query;
    const data = await schoolService.getSchoolOptions(oldProvinceId);
    res.status(200).json({
      message: 'School options retrieved successfully',
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

const getSchoolById = async (req, res) => {
  try {
    const data = await schoolService.getSchoolById(req.params.id);
    res.status(200).json({
      message: 'School retrieved successfully',
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

const createSchool = async (req, res) => {
  try {
    const school = await schoolService.createSchool(req.body);
    res.status(201).json({
      message: 'School created successfully',
      data: school
    });
  } catch (error) {
    handleError(res, error);
  }
};

const updateSchool = async (req, res) => {
  try {
    const data = await schoolService.updateSchool(req.params.id, req.body);
    res.status(200).json({
      message: 'School updated successfully',
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

const deleteSchool = async (req, res) => {
  try {
    await schoolService.deleteSchool(req.params.id);
    res.status(200).json({
      message: 'School deleted successfully'
    });
  } catch (error) {
    handleError(res, error);
  }
};

const getStatistics = async (req, res) => {
  try {
    const data = await schoolService.getStatistics();
    res.status(200).json({
      message: 'Statistics retrieved successfully',
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  getAllSchools,
  getSchoolOptions,
  getSchoolById,
  createSchool,
  updateSchool,
  deleteSchool,
  getStatistics
};

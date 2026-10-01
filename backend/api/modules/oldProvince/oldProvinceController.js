const oldProvinceService = require('./oldProvinceService');

const handleError = (res, error) => {
  const status = error.status || 500;
  res.status(status).json({
    error: error.message,
    ...(status === 500 && { details: error.message })
  });
};

const getAllOldProvinces = async (req, res) => {
  try {
    const data = await oldProvinceService.getAllOldProvinces();
    res.status(200).json({
      message: 'Old Provinces retrieved successfully',
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { getAllOldProvinces };

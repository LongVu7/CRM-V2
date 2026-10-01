const newProvinceService = require('./newProvinceService');

const handleError = (res, error) => {
  const status = error.status || 500;
  res.status(status).json({
    error: error.message,
    ...(status === 500 && { details: error.message })
  });
};

const getAllNewProvinces = async (req, res) => {
  try {
    const data = await newProvinceService.getAllNewProvinces();
    res.status(200).json({
      message: 'New Provinces retrieved successfully',
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { getAllNewProvinces };

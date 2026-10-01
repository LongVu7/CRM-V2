const majorDataService = require('./majorDataService');

const handleError = (res, error) => {
  const status = error.status || 500;
  res.status(status).json({
    error: error.message,
    ...(status === 500 && { details: error.message })
  });
};

// ─── Get root options (first dropdown)
const getRootOptions = async (req, res) => {
  try {
    const data = await majorDataService.getRootOptions();
    res.status(200).json({
      message: 'Root options retrieved successfully',
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Get children by parent ID (cascading dropdown)
const getChildrenById = async (req, res) => {
  try {
    const data = await majorDataService.getChildrenById(req.params.id);
    res.status(200).json({
      message: 'Children retrieved successfully',
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  getRootOptions,
  getChildrenById
};

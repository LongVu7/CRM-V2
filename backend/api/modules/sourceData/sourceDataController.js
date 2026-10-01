const sourceDataService = require('./sourceDataService');

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
    const data = await sourceDataService.getRootOptions();
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
    const data = await sourceDataService.getChildrenById(req.params.id);
    res.status(200).json({
      message: 'Children retrieved successfully',
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Get source data by ID (for edit view initialization)
const getSourceDataById = async (req, res) => {
  try {
    const data = await sourceDataService.getSourceDataById(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Source data not found' });
    }
    res.status(200).json({
      message: 'Source data retrieved successfully',
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  getRootOptions,
  getChildrenById,
  getSourceDataById
};

const statusDataService = require('./statusDataService');

const handleError = (res, error) => {
  const status = error.status || 500;
  res.status(status).json({
    error: error.message,
    ...(status === 500 && { details: error.message })
  });
};

// ─── Get root options (interaction-level, first dropdown)
const getRootOptions = async (req, res) => {
  try {
    const data = await statusDataService.getRootOptions();
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
    const data = await statusDataService.getChildrenById(req.params.id);
    res.status(200).json({
      message: 'Children retrieved successfully',
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

// ─── Get status data by ID (for edit view)
const getStatusDataById = async (req, res) => {
  try {
    const data = await statusDataService.getStatusDataById(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Status data not found' });
    }
    res.status(200).json({
      message: 'Status data retrieved successfully',
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  getRootOptions,
  getChildrenById,
  getStatusDataById
};

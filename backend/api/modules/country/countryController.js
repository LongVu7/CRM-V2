const countryService = require('./countryService');

const handleError = (res, error) => {
  const status = error.status || 500;
  res.status(status).json({
    error: error.message,
    ...(status === 500 && { details: error.message })
  });
};

const getAllCountries = async (req, res) => {
  try {
    const data = await countryService.getAllCountries();
    res.status(200).json({
      message: 'Countries retrieved successfully',
      data
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { getAllCountries };

const reportService = require('./reportService');

// const handleError = (res, error) => {
//   const status = error.status || 500;
//   res.status(status).json({
//     error: error.message,
//     ...(status === 500 && { details: error.message })
//   });
// };
const handleError = (res, error) => {
  const status = error.status || 500;

  if (status === 500) {
    return res.status(500).json({
      error: 'Internal Server Error'
    });
  }

  return res.status(status).json({
    error: error.message
  });
};


const getDashboardReport = async (req, res) => {
  try {
    const data = await reportService.getDashboard(req.query, req.user);
    res.status(200).json({
      message: 'Dashboard retrieved successfully',
      data
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error.message);
    console.error('Stack:', error.stack);
    if (error.meta) console.error('Prisma meta:', error.meta);
    handleError(res, error);
  }
};

module.exports = {
  getDashboardReport
};

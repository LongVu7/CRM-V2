const multer = require('multer');
const errorReportService = require('./errorReportService');
const { uploadToCloudinary } = require('../../../config/cloudinary');

const upload = multer({ storage: multer.memoryStorage() });

const handleError = (res, error) => {
  const status = error.status || 500;
  res.status(status).json({ error: error.message });
};

const create = [
  upload.single('image'),
  async (req, res) => {
    try {
      let imageUrl = null;
      if (req.file) {
        imageUrl = await uploadToCloudinary(req.file.buffer);
      }

      const report = await errorReportService.createReport(
        { title: req.body.title, description: req.body.description, imageUrl },
        req.user.accountId
      );

      res.status(201).json({ message: 'Report created successfully', data: report });
    } catch (error) {
      handleError(res, error);
    }
  }
];

const list = async (req, res) => {
  try {
    const reports = await errorReportService.listReports();
    res.status(200).json({ data: reports });
  } catch (error) {
    handleError(res, error);
  }
};

const getById = async (req, res) => {
  try {
    const report = await errorReportService.getReportById(req.params.id);
    res.status(200).json({ data: report });
  } catch (error) {
    handleError(res, error);
  }
};

const updateStatus = async (req, res) => {
  try {
    const report = await errorReportService.updateReportStatus(req.params.id, req.body.status);
    res.status(200).json({ message: 'Status updated', data: report });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { create, list, getById, updateStatus };

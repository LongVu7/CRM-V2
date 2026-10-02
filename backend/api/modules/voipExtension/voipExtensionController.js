const prisma = require('../../../config/db');
const voipExtensionService = require('./voipExtensionService');

const handleError = (res, error) => {
  const status = error.status || 500;
  res.status(status).json({ error: error.message, ...(status === 500 && { details: error.message }) });
};

const getMyExtension = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    if (!accountId) {
      return res.status(401).json({ error: 'Unauthorized: User not identified' });
    }

    const extension = await prisma.voipExtension.findUnique({
      where: { accountId },
    });

    if (!extension || !extension.isActive) {
      return res.status(404).json({ error: 'No active VoIP extension found for this account' });
    }

    const ephemeralToken = `temp_${extension.extensionNumber}_${Date.now()}`;

    res.status(200).json({
      message: 'Extension retrieved successfully',
      data: {
        extensionNumber: extension.extensionNumber,
        wssUrl: process.env.WSS_URL || 'wss://sip.example.com:8089/ws',
        sipToken: ephemeralToken,
      }
    });

  } catch (error) {
    handleError(res, error);
  }
};

const createVoipExtension = async (req, res) => {
  try {
    const data = await voipExtensionService.createVoipExtension(req.body);
    // Don't leak encrypted password back
    const { sipPasswordEncrypted, ...safeData } = data;
    res.status(201).json({ message: 'VoIP Extension created', data: safeData });
  } catch (error) {
    handleError(res, error);
  }
};

const updateVoipExtension = async (req, res) => {
  try {
    const data = await voipExtensionService.updateVoipExtension(req.params.id, req.body);
    const { sipPasswordEncrypted, ...safeData } = data;
    res.status(200).json({ message: 'VoIP Extension updated', data: safeData });
  } catch (error) {
    handleError(res, error);
  }
};

const getAllExtensions = async (req, res) => {
  try {
    const data = await voipExtensionService.getAllExtensions();
    const safeData = data.map(ext => {
      const { sipPasswordEncrypted, ...rest } = ext;
      return rest;
    });
    res.status(200).json({ message: 'VoIP Extensions retrieved', data: safeData });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  getMyExtension,
  createVoipExtension,
  updateVoipExtension,
  getAllExtensions
};

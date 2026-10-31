const voipService = require('./voipService');

const getToken = async (req, res) => {
  try {
    const tokenData = await voipService.getStaffToken(req.user);
    return res.status(200).json(tokenData);
  } catch (error) {
    console.error('Error generating Stringee token:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate Stringee access token' });
  }
};

const getCallReadiness = async (req, res) => {
  try {
    const { id } = req.params;
    const readiness = await voipService.checkCallReadiness(id, req.user, req.ability);

    if (readiness.reason === 'INQUIRY_NOT_FOUND') {
      return res.status(404).json(readiness);
    }

    if (!readiness.canCall && readiness.reason === 'UNAUTHORIZED_CALLER') {
      return res.status(403).json(readiness);
    }

    return res.status(200).json(readiness);
  } catch (error) {
    console.error('Error checking call readiness:', error);
    return res.status(500).json({ error: error.message || 'Failed to evaluate inquiry call readiness' });
  }
};

const createCall = async (req, res) => {
  try {
    const call = await voipService.createCallRecord(req.body, req.user.id);
    return res.status(201).json(call);
  } catch (error) {
    console.error('Error creating call record:', error);
    return res.status(500).json({ error: error.message || 'Failed to create call record' });
  }
};

const updateCall = async (req, res) => {
  try {
    const { id } = req.params;
    const call = await voipService.updateCallRecord(id, req.body);
    return res.status(200).json(call);
  } catch (error) {
    console.error('Error updating call record:', error);
    return res.status(500).json({ error: error.message || 'Failed to update call record' });
  }
};

const getInquiryCalls = async (req, res) => {
  try {
    const { id } = req.params;
    const calls = await voipService.getInquiryCallHistory(id);
    return res.status(200).json({ data: calls });
  } catch (error) {
    console.error('Error fetching inquiry call history:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve call history' });
  }
};

const getAllCalls = async (req, res) => {
  try {
    const { page, limit, search, status, disposition } = req.query;
    const result = await voipService.getAllCalls({ page, limit, search, status, disposition });
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching call records:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve call records' });
  }
};

module.exports = {
  getToken,
  getCallReadiness,
  createCall,
  updateCall,
  getInquiryCalls,
  getAllCalls
};

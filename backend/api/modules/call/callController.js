const callService = require('./callService');
const callDispositionService = require('./callDispositionService');
const { createCallSchema } = require('./callSchemas');

const handleError = (res, error) => {
  const status = error.status || 500;
  res.status(status).json({ error: error.message, ...(status === 500 && { details: error.message }) });
};

const createCall = async (req, res) => {
  try {
    const parsedData = createCallSchema.parse(req.body);
    const accountId = req.user?.accountId;
    
    if (!accountId) {
      return res.status(401).json({ error: 'Unauthorized: User not identified' });
    }

    const call = await callService.createCall({
      ...parsedData,
      handledById: accountId
    });

    res.status(201).json({
      message: 'Call created successfully',
      data: call
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    handleError(res, error);
  }
};

const updateCall = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body; // In real app, validate with Zod
    const call = await callService.updateCall(id, updates);
    res.status(200).json({ message: 'Call updated', data: call });
  } catch (error) {
    handleError(res, error);
  }
};

const finalizeCall = async (req, res) => {
  try {
    const { id } = req.params;
    const call = await callService.finalizeCall(id);
    res.status(200).json({ message: 'Call finalized', data: call });
  } catch (error) {
    handleError(res, error);
  }
};

const getAllCalls = async (req, res) => {
  try {
    const filters = req.query;
    const { calls, totalCount } = await callService.getAllCalls(filters);
    res.status(200).json({
      message: 'Calls retrieved successfully',
      data: calls,
      totalCount
    });
  } catch (error) {
    handleError(res, error);
  }
};

// --- Call Disposition ---

const getAllDispositions = async (req, res) => {
  try {
    const data = await callDispositionService.getAllDispositions();
    res.status(200).json({ message: 'Dispositions retrieved successfully', data });
  } catch (error) {
    handleError(res, error);
  }
};

const createDisposition = async (req, res) => {
  try {
    const data = await callDispositionService.createDisposition(req.body);
    res.status(201).json({ message: 'Disposition created', data });
  } catch (error) {
    handleError(res, error);
  }
};

const updateDisposition = async (req, res) => {
  try {
    const data = await callDispositionService.updateDisposition(req.params.id, req.body);
    res.status(200).json({ message: 'Disposition updated', data });
  } catch (error) {
    handleError(res, error);
  }
};

const deleteDisposition = async (req, res) => {
  try {
    await callDispositionService.deleteDisposition(req.params.id);
    res.status(200).json({ message: 'Disposition deleted' });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  createCall,
  updateCall,
  finalizeCall,
  getAllCalls,
  getAllDispositions,
  createDisposition,
  updateDisposition,
  deleteDisposition
};

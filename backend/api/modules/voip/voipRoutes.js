const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const { validateBody, validateParams } = require('../../../middleware/validate');
const { idParamSchema } = require('../../../schemas/commonSchemas');
const { createCallSchema, updateCallSchema } = require('./voipSchemas');
const voipController = require('./voipController');
const voipService = require('./voipService');

// ─── Token Route
router.get('/token', authenticate, voipController.getToken);
router.get('/voip/token', authenticate, voipController.getToken);
// Test token for Student Receiver simulator (used for demo/testing)
router.get('/test-token', (req, res) => {
  try {
    const rawId = req.query.userId || req.query.phone || '84000445567';
    const normalized = voipService.normalizePhoneNumber(rawId) || String(rawId);
    const { generateStringeeToken } = require('../../../config/stringee');
    const tokenData = generateStringeeToken(normalized);
    return res.status(200).json(tokenData);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── Stringee Project Answer URL (SCCO Webhook for call routing)
router.all('/answer-url', (req, res) => {
  const from = req.query.from || req.body?.from || '';
  const to = req.query.to || req.body?.to || '';

  return res.json([
    {
      action: 'connect',
      from: {
        type: 'internal',
        number: from
      },
      to: {
        type: 'internal',
        number: to
      },
      timeout: 45,
      peerToPeerCall: false
    }
  ]);
});

// ─── Lead Call Readiness & History
router.get('/leads/:id/call-readiness', authenticate, validateParams(idParamSchema), voipController.getCallReadiness);
router.get('/leads/:id/calls', authenticate, validateParams(idParamSchema), voipController.getLeadCalls);

// ─── Call Lifecycle Logging & Global History
router.get('/calls', authenticate, voipController.getAllCalls);
router.post('/calls', authenticate, validateBody(createCallSchema), voipController.createCall);
router.patch('/calls/:id', authenticate, validateParams(idParamSchema), validateBody(updateCallSchema), voipController.updateCall);

module.exports = router;

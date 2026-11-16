const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const chatbotController = require('./chatbotController');

router.post('/message', authenticate, chatbotController.handleChatMessage);

module.exports = router;


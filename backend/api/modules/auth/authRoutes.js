const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authController = require('./authController');

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);
router.post('/refresh', authenticate, authController.refreshToken);

module.exports = router;

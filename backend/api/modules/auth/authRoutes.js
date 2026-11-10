const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authController = require('./authController');

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);
router.post('/refresh', authenticate, authController.refreshToken);
router.put('/change-password', authenticate, authController.changePassword);
router.put('/profile', authenticate, authController.updateProfile);

module.exports = router;

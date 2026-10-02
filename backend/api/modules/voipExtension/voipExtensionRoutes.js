const express = require('express');
const router = express.Router();
const voipExtensionController = require('./voipExtensionController');
const { authorize } = require('../../middlewares/auth');

router.get('/me', authorize(['call.make', 'call.receive']), voipExtensionController.getMyExtension);

// Admin Routes
router.get('/', authorize(['admin']), voipExtensionController.getAllExtensions);
router.post('/', authorize(['admin']), voipExtensionController.createVoipExtension);
router.put('/:id', authorize(['admin']), voipExtensionController.updateVoipExtension);

module.exports = router;

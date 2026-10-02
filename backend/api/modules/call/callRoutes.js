const express = require('express');
const router = express.Router();
const callController = require('./callController');
const { authorize } = require('../../middlewares/auth');

router.get('/', authorize(['call.read']), callController.getAllCalls);
router.post('/', authorize(['call.make']), callController.createCall);
router.patch('/:id', authorize(['call.make']), callController.updateCall);
router.post('/:id/finalize', authorize(['call.make']), callController.finalizeCall);

// Call Dispositions
router.get('/dispositions', authorize(['call.read']), callController.getAllDispositions);
router.post('/dispositions', authorize(['call.manage']), callController.createDisposition);
router.put('/dispositions/:id', authorize(['call.manage']), callController.updateDisposition);
router.delete('/dispositions/:id', authorize(['call.manage']), callController.deleteDisposition);

module.exports = router;

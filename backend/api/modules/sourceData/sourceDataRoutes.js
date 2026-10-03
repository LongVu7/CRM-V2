const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { validateParams } = require('../../../middleware/validate');
const { idParamSchema } = require('../../../schemas/commonSchemas');
const sourceDataController = require('./sourceDataController');

// ─── Dropdown APIs
router.route('/')
    .get(authenticate,sourceDataController.getRootOptions);

router.route('/:id/children')
    .get(authenticate, validateParams(idParamSchema), sourceDataController.getChildrenById);

router.route('/:id')
    .get(authenticate,validateParams(idParamSchema), sourceDataController.getSourceDataById);

module.exports = router;
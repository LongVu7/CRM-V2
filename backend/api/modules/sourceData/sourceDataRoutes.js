const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { authorizeLookup } = require('../../../authorization/lookupPolicy');
const { validateParams } = require('../../../middleware/validate');
const { idParamSchema } = require('../../../schemas/commonSchemas');
const sourceDataController = require('./sourceDataController');

// ─── Dropdown APIs
router.route('/')
    .get(authenticate, authorizeLookup('source_data.read'), sourceDataController.getRootOptions);

router.route('/:id/children')
    .get(authenticate, authorizeLookup('source_data.read'), validateParams(idParamSchema), sourceDataController.getChildrenById);

router.route('/:id')
    .get(authenticate, authorizeLookup('source_data.read'), validateParams(idParamSchema), sourceDataController.getSourceDataById);

module.exports = router;
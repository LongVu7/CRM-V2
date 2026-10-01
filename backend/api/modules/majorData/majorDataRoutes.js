const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { authorizeLookup } = require('../../../authorization/lookupPolicy');
const { validateParams } = require('../../../middleware/validate');
const { idParamSchema } = require('../../../schemas/commonSchemas');
const majorDataController = require('./majorDataController');

// ─── Dropdown APIs
router.route('/')
    .get(authenticate, authorizeLookup('major_data.read'), majorDataController.getRootOptions);

router.route('/:id/children')
    .get(authenticate, authorizeLookup('major_data.read'), validateParams(idParamSchema), majorDataController.getChildrenById);

module.exports = router;

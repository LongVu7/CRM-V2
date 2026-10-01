const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const authorize = require('../../../middleware/authorize');
const { authorizeLookup } = require('../../../authorization/lookupPolicy');
const oldProvinceController = require('./oldProvinceController');

router.route('/')
    .get(authenticate, authorizeLookup('old_province.read'), oldProvinceController.getAllOldProvinces);

module.exports = router;
